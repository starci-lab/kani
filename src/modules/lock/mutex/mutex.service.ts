import { sleep } from "@utils"
import { Injectable } from "@nestjs/common"
import { Mutex } from "async-mutex"

@Injectable()
export class MutexService {
    private readonly mutexes = new Map<string, Mutex>()

    mutex(key: string) {
        if (!this.mutexes.has(key)) {
            this.mutexes.set(key, new Mutex())
        }
        return this.mutexes.get(key)!
    }
    /**
     * Run callback under mutex lock, then wait cooldown before next lock
     */
    async runWithCooldown<T>({
        key,
        callback,
        onError,
        timeout,
    }: RunWithCooldownParams<T>): Promise<void> {
        const mutex = this.mutex(key)
        return mutex.runExclusive(
            async () => {
                try {
                    await callback()
                    await sleep(timeout)
                } catch (error) {
                    onError?.(error)
                }
            })
    }
}

export interface RunWithCooldownParams<T> {
    key: string
    callback: () => Promise<T>
    onError?: (error: Error) => void
    timeout: number
}