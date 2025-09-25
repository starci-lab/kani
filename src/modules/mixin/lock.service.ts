import { Injectable, Logger } from "@nestjs/common"
import { sleep } from "@modules/common"
import { AsyncService } from "./async.service"

@Injectable()
export class LockService {
    private readonly logger = new Logger(LockService.name)
    private locks = new Set<string>()
    private ephemeralLocks = new Set<string>()
    constructor(
        private readonly asyncService: AsyncService,
    ) { }
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
        groupName,
    }: WithLockParams): Promise<void> {
        const prefix = groupName ? `[${groupName}]` : ""

        // check blocked keys
        const blocked = blockedKeys.filter(k => this.isLocked(k))
        if (blocked.length > 0) {
            this.logger.debug(`${prefix} Blocked by keys: ${blocked.join(", ")}`)
            return
        }

        // acquire all keys
        const failed = acquiredKeys.filter(k => !this.acquire(k))
        if (failed.length > 0) {
            this.logger.debug(`${prefix} Cannot acquire keys: ${failed.join(", ")}`)
            return
        }

        try {
            this.logger.debug(`${prefix} Acquired keys: ${acquiredKeys.join(", ")}`)
            await callback()
        } finally {
            await this.asyncService.allIgnoreError(
                releaseKeys.map(async (releaseKey) => {
                    await sleep(releaseTimeMs)
                    this.release(releaseKey)
                })
            )
            this.logger.debug(`${prefix} Released keys: ${releaseKeys.join(", ")}`)
        }
    }

    /** Check if a key is locked */
    isLocked(key: string): boolean {
        return this.locks.has(key)
    }

    /** Add a lock key */
    addLockKey(key: string) {
        this.locks.add(key)
    }

    /** Add a ephemeral lock key */
    addEphemeralLockKey(key: string) {
        this.ephemeralLocks.add(key)
    }

    /** Check if a key is ephemeral locked */
    isEphemeralLocked(key: string): boolean {
        return this.ephemeralLocks.has(key)
    }

    /** Release a ephemeral lock key */
    releaseEphemeralLockKey(key: string) {
        this.ephemeralLocks.delete(key)
    }
}

export interface WithLockParams {
  blockedKeys: Array<string>
  acquiredKeys: Array<string>
  releaseKeys: Array<string>
  callback: () => Promise<void> | void
  releaseTimeMs?: number
  groupName?: string
}
