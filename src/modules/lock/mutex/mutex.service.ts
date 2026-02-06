import {
    Mutex
} from "async-mutex"
import {
    Injectable
} from "@nestjs/common"
import {
    sleep
} from "@modules/common"
import type {
    RunWithCooldownParams,
    RunWithCooldownResult
} from "./types"

/**
 * Service for mutex locks.
 */
@Injectable()
export class MutexService {
    private readonly mutexes = new Map<string, Mutex>()

    /**
     * Get a mutex for a given key (creates one if it does not exist).
     * @param key - The key for the mutex.
     * @returns The mutex.
     */
    mutex(key: string): Mutex {
        if (!this.mutexes.has(key)) {
            this.mutexes.set(key,
                new Mutex())
        }
        return this.mutexes.get(key)!
    }

    /**
     * Run callback under mutex lock, then wait cooldown before next lock.
     */
    async runWithCooldown<T>(
        params: RunWithCooldownParams<T>,
    ): Promise<RunWithCooldownResult> {
        const { key, callback, onError, timeout } = params
        const mutex = this.mutex(key)
        return mutex.runExclusive(async () => {
            try {
                await callback()
                await sleep(timeout)
            } catch (error) {
                onError?.(error as Error)
            }
        })
    }
}