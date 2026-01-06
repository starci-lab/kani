import { Injectable } from "@nestjs/common"

@Injectable()
export class AtomicLockService {
    /**
     * Stores atomic locks by key.
     * - Each key represents an independent critical section
     * - A atomic lock is a boolean value that indicates if the critical section is locked
     */
    private readonly atomicLocks = new Map<string, AtomicLock>()

    /**
     * Get a atomic lock for a given key (creates one if it does not exist).
     *
     * @param key - Identifier for the lock
     */
    atomicLock(key: string): AtomicLock {
        if (!this.atomicLocks.has(key)) {
            this.atomicLocks.set(key, new AtomicLock())
        }
        return this.atomicLocks.get(key)!
    }
}

export class AtomicLock {
    private locked = false
    constructor() {}

    isLocked(): boolean {
        return this.locked
    }

    lock(): void {
        this.locked = true
    }

    unlock(): void {
        this.locked = false
    }
}