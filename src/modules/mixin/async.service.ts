import { Injectable } from "@nestjs/common"
import { RetryService } from "./retry.service"

@Injectable()
export class AsyncService {
    constructor(
        private readonly retryService: RetryService
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
                    }
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
}

export type ResolveTupleResult<T> = [T , null] | [null, Error]