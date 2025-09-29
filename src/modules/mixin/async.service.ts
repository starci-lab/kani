import { Injectable } from "@nestjs/common"

@Injectable()
export class AsyncService {
    //allSettled<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>>; }>;
    async allIgnoreError<T extends readonly unknown[]>(
        promises: { [K in keyof T]: Promise<T[K]> }
    ): Promise<{ [K in keyof T]: T[K] | null }> {
        const results = await Promise.allSettled(promises)
        return results.map(r => (r.status === "fulfilled" ? r.value : null)) as {
          [K in keyof T]: T[K] | null;
        }
    }

    // go-like async resolve tuple
    async resolveTuple<T>(
        promise: Promise<T>
    ): Promise<[T | null, Error | null]> {
        try {
            return [await promise, null]
        } catch (error) {
            return [null, error]
        }
    }   
}