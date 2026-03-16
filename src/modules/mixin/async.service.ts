import {
    Injectable
} from "@nestjs/common"
import {
    RetryService
} from "./retry.service"
import type {
    ResolveTupleResult,
    RetryOptions
} from "./types"
/**
  * Service for asynchronous operations.
  */
@Injectable()
export class AsyncService {
    constructor(
        private readonly retryService: RetryService
    ) {}

    /**
     * Resolve all promises and return an array of results, ignoring errors.
     * @param promises - The promises to resolve.
     * @returns An array of results, ignoring errors.
     */
    async allIgnoreError<T extends readonly unknown[]>(
        promises: { [K in keyof T]: Promise<T[K]> },
    ): Promise<{ [K in keyof T]: T[K] | null }> {
        const results = await Promise.allSettled(promises)
        return results.map(r => (r.status === "fulfilled" ? r.value : null)) as {
            [K in keyof T]: T[K] | null
        }
    }

    /**
     * Resolve all promises and return an array of results, retrying on errors.
     * @param promises - The promises to resolve.
     * @param options - The options for the retry.
     * @returns An array of results, retrying on errors.
     */
    async allMustDone<T extends readonly unknown[]>(
        promises: { [K in keyof T]: Promise<T[K]> },
        options?: RetryOptions,
    ): Promise<{ [K in keyof T]: T[K] }> {
        return await Promise.all(
            Object.values(promises).map(async (promise) => {
                return await this.retryService.retry({
                    options,
                    action: async () => await promise,
                })
            }),
        ) as { [K in keyof T]: T[K] }
    }

    /**
     * Resolve the first promise to complete and return its value.
     * @param promises - The promises to resolve.
     * @returns The value of the first promise to complete.
     */
    async raceValue<T extends readonly unknown[]>(
        promises: [...{ [K in keyof T]: Promise<T[K]> }],
    ): Promise<T[number]> {
        return Promise.race(promises)
    }

    /**
     * Resolve a promise to a tuple [value, null] or [null, error] (go-style).
     * @param promise - The promise to resolve.
     * @returns A tuple [value, null] or [null, error].
     */
    async resolveTuple<T>(
        promise: Promise<T>,
    ): Promise<ResolveTupleResult<T>> {
        try {
            return [await promise,
                null]
        } catch (error) {
            return [null,
error as Error]
        }
    }

    /**
     * Run a callback silently, ignoring errors.
     * @param callback - The callback to run.
     */
    async safeRun(callback: () => Promise<void>): Promise<void> {
        try {
            await callback()
        } catch {
            // do nothing
        }
    }
}