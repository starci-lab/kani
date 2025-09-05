import { Injectable, Logger } from "@nestjs/common"
import { sleep } from "@modules/common"

@Injectable()
export class LockService {
    private readonly logger = new Logger(LockService.name)
    private locks = new Set<string>()

    /** Try to acquire lock */
    private acquire(key: string): boolean {
        if (this.locks.has(key)) return false
        this.locks.add(key)
        return true
    }

    /** Release lock */
    private release(key: string) {
        this.locks.delete(key)
    }

    /**
     * Execute a callback with locks
     */
    async withLocks({
        blockedKeys,
        acquiredKeys,
        releaseKeys,
        callback,
        releaseTimeMs = 1000,
    }: WithLockParams): Promise<void> {
        // check blocked keys
        for (const blockKey of blockedKeys) {
            if (this.isLocked(blockKey)) {
                this.logger.debug(`Execution blocked by ${blockKey}`)
                return
            }
        }

        // acquire all keys
        for (const acquiredKey of acquiredKeys) {
            if (!this.acquire(acquiredKey)) {
                this.logger.debug(`Cannot acquire key ${acquiredKey}`)
                return
            }
        }

        try {
            await callback()
        } finally {
            // release all keys after delay
            await Promise.all(
                releaseKeys.map(async (releaseKey) => {
                    await sleep(releaseTimeMs)
                    this.release(releaseKey)
                })
            )
        }
    }

    /** Check if a key is locked */
    isLocked(key: string): boolean {
        return this.locks.has(key)
    }
}

export interface WithLockParams {
    blockedKeys: Array<string>
    acquiredKeys: Array<string>
    releaseKeys: Array<string>
    callback: () => Promise<void> | void
    releaseTimeMs?: number
}