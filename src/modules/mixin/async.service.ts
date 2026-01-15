import { Injectable } from "@nestjs/common"
import { RetryService } from "./retry.service"
import { DayjsService } from "./dayjs.service"
import { envConfig } from "@modules/env"
import { from, Subject, race, EMPTY, catchError, switchMap, timeout, lastValueFrom } from "rxjs"

@Injectable()
export class AsyncService {
    constructor(
        private readonly retryService: RetryService,
        private readonly dayjsService: DayjsService
    ) {}
    //allSettled<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>>; }>;
    async allIgnoreError<T extends readonly unknown[]>(
        promises: { [K in keyof T]: Promise<T[K]> }
    ): Promise<{ [K in keyof T]: T[K] | null }> {
        const results = await Promise.allSettled(promises)
        return results.map(r => (r.status === "fulfilled" ? r.value : null)) as {
          [K in keyof T]: T[K] | null;
        }
    }

    async allMustDone<T extends readonly unknown[]>(
        promises: { [K in keyof T]: Promise<T[K]> }
    ): Promise<{ [K in keyof T]: T[K] }> {
        return await Promise.all(Object.values(promises).map(
            async (promise) => {
                return await this.retryService.retry({
                    action: async () => {
                        return await promise
                    },
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    delay: envConfig().timeConfig.retry.delay,
                    factor: envConfig().timeConfig.retry.factor,
                })
            })) as { [K in keyof T]: T[K] }
    }

    // go-like async resolve tuple
    async resolveTuple<T>(
        promise: Promise<T>
    ): Promise<ResolveTupleResult<T>> {
        try {
            return [await promise, null]
        } catch (error) {
            return [null, error]
        }
    }   

    async suppressErrorAfterTimeoutRx<T>(
        action: (markMessageReceived: () => void) => Promise<T>,
        timeoutMs: number
    ): Promise<T | void> {
        const heartbeat$ = new Subject<void>()
        
        const action$ = from(
            action(() => heartbeat$.next())
        )
        return await lastValueFrom(
            race(
                action$,
                heartbeat$.pipe(
                    timeout({ each: timeoutMs }),
                    switchMap(() => EMPTY)
                )
            )
                .pipe(
                    catchError(() => EMPTY)
                )
        )
    }

    async executeWithFallbacks<T>({
        action,
        fallbacks,
        attempts = envConfig().timeConfig.retry.maxRetries,
    }: ExecuteWithFallbacksParams<T>): Promise<T> {
        const retryConfig = {
            maxRetries: attempts,
            delay: envConfig().timeConfig.retry.delay,
            factor: envConfig().timeConfig.retry.factor,
        }
      
        let lastError: unknown
      
        const tryAction = async (fn: () => Promise<T>) =>
            this.resolveTuple(this.retryService.retry({ action: fn, ...retryConfig }))
      
        // 1. Try primary action
        let [result, error] = await tryAction(action)
        if (result) return result
      
        lastError = error
      
        // 2. Try fallbacks sequentially
        for (const fallback of fallbacks) {
            ;[result, error] = await tryAction(fallback)
            if (result) return result
            lastError = error
        }
      
        // 3. All failed
        throw lastError
    }
}

export interface ExecuteWithFallbacksParams<T> {
    action: () => Promise<T>
    fallbacks: Array<() => Promise<T>>
    attempts?: number
}

export type ResolveTupleResult<T> = [T , null] | [null, Error]