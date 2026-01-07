import { Injectable } from "@nestjs/common"
import { Sema } from "async-sema"

@Injectable()
export class SemaService {
    /**
     * Stores semaphores by key.
     * - Each key represents an independent critical section
     * - A semaphore limits how many jobs can run concurrently per key
     */
    private readonly semas = new Map<string, Sema>()

    /**
     * Get a semaphore for a given key (creates one if it does not exist).
     *
     * @param key - Identifier for the lock
     * @param maxConcurrency - Maximum number of concurrent jobs allowed
     *   - 1  : simple mutex-style lock (only one job runs, others should skip)
     *   - >1 : allow N jobs to run in parallel
     *
     * IMPORTANT:
     * - Use `tryAcquire()` to attempt the lock without waiting
     * - If `tryAcquire()` returns false, the caller should skip the job
     * - Call `release()` ONLY if the semaphore was successfully acquired
     */
    sema(key: string, maxConcurrency = 1): Sema {
        if (!this.semas.has(key)) {
            this.semas.set(key, new Sema(maxConcurrency))
        }
        return this.semas.get(key)!
    }
}
