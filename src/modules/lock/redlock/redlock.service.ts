import { Injectable } from "@nestjs/common"
import { InjectRedlock } from "./redlock.decorators"
import Redlock, { Lock } from "redlock"
import { getRedlockKey, RedlockKey } from "./utils"

@Injectable()
export class RedlockService {
    // Stores all currently acquired locks in memory
    private readonly locks = new Map<string, Lock>()

    constructor(
        @InjectRedlock()
        private readonly redlock: Redlock,
    ) {}

    /**
     * Acquire a distributed lock for a given bot and key.
     * @param botId - The ID of the bot acquiring the lock
     * @param redlockKey - The type of lock to acquire
     * @returns The acquired Lock object
     */
    async acquire({ botId, redlockKey }: AcquiredLockParams) {
        const lock = await this.redlock.acquire(
            [
                getRedlockKey(
                    redlockKey, 
                    botId
                )
            ], 
            -1 // NOTE: TTL set to -1 means "infinite" (not recommended)
        )
        this.locks.set(getRedlockKey(redlockKey, botId), lock)
        return lock
    }

    /**
     * Release a previously acquired lock for a given bot and key.
     * @param botId - The ID of the bot that holds the lock
     * @param redlockKey - The type of lock to release
     * @throws Error if no lock is found for the given bot and key
     */
    async releaseIfAcquired({ botId, redlockKey }: AcquiredLockParams) {
        const lock = this.locks.get(getRedlockKey(redlockKey, botId))
        if (!lock) {
            // we do nothing if the lock is not found
            return
        }
        await this.redlock.release(lock)
        this.locks.delete(getRedlockKey(redlockKey, botId))
    }
}

export interface AcquiredLockParams {
    botId: string
    redlockKey: RedlockKey
}