import { envConfig } from "@modules/env"
import { Injectable } from "@nestjs/common"
import { UnrecoverableError } from "bullmq"

/**
 * LeaseService manages in-memory, lease-based locks scoped by string keys.
 *
 * Characteristics:
 * - Single-process, in-memory only (NOT distributed)
 * - Non-blocking (try-lock semantics, no waiting / no queue)
 * - Token-owned (only the owner token can unlock)
 * - Time-bound (locks automatically expire after a TTL)
 *
 * This is designed for simple concurrency control in a single Node.js process
 * (e.g. bot jobs, schedulers, critical sections that must not overlap).
 */
@Injectable()
export class LeaseService {
    /**
     * Stores lease locks by key.
     *
     * Each key represents an independent critical section.
     * A lease lock ensures that only one token can hold the lock at a time,
     * and that the lock is automatically released after a fixed TTL.
     */
    private readonly leaseLocks = new Map<string, LeaseLock>()

    /**
     * Get a lease lock for a given key (creates one if it does not exist).
     *
     * @param key - Identifier for the protected resource
     * @returns LeaseLock instance associated with the key
     *
     * Note:
     * - The returned lock is shared for the same key.
     * - Different keys are completely independent.
     */
    lease(key: string): LeaseLock {
        if (!this.leaseLocks.has(key)) {
            this.leaseLocks.set(key, new LeaseLock(envConfig().timeConfig.lease))
        }
        return this.leaseLocks.get(key)!
    }
}

/**
 * LeaseLock implements a token-owned, time-limited (TTL) lock.
 *
 * Semantics:
 * - tryLock(token): attempts to acquire the lock without waiting
 *   - returns true if acquired or already held by the same token
 *   - returns false if held by a different token
 * - unlock(token): releases the lock only if the token matches the owner
 * - automatic expiration: the lock is released when the TTL expires
 *
 * This is NOT a mutex or semaphore:
 * - no queue
 * - no blocking
 * - no fairness guarantees
 *
 * Intended for simple, best-effort mutual exclusion in a single process.
 */
export class LeaseLock {
    /**
     * Current owner token of the lock.
     * Null means the lock is free.
     */
    private token: string | null = null

    /**
     * Timer used to enforce the lease TTL.
     */
    private timer?: NodeJS.Timeout

    /**
     * @param ttl - Lease duration in milliseconds.
     *              When the TTL expires, the lock is automatically released.
     */
    constructor(private readonly ttl: number) {}

    /**
     * Attempt to acquire the lock for the given token.
     *
     * @param token - Unique identifier of the caller (lock owner)
     * @returns true if the lock is acquired or already owned by this token,
     *          false if the lock is owned by another token
     */
    tryLock(token: string): boolean {
        // Re-entrant for the same token (idempotent)
        if (this.token === token) return true
        // Lock is held by someone else
        if (this.token !== null) return false
        // Acquire lock and start lease timer
        this.token = token
        this.resetTimer()
        return true
    }
    /**
     * Get the current token that owns the lock.
     * @returns The token that owns the lock, or null if the lock is free.
     */
    getToken(): string | null {
        return this.token
    }

    /**
     * Release the lock if the caller owns it.
     *
     */
    unlock(token: string): void {
        if (this.token !== token) return
        this.clear()
    }

    /**
     * Check whether the lock is currently held by any token.
     */
    isLocked(): boolean {
        return this.token !== null
    }
    /**
     * Reset the lease timer.
     * When the timer expires, the lock is automatically released.
     */
    private resetTimer() {
        if (this.timer) clearTimeout(this.timer)
        this.timer = setTimeout(() => this.clear(), this.ttl)
    }
    /**
     * Ensure the lock is held by the given token.
     * If the lock is not held by the given token, throw an error.
     * If the lock is not held, acquire the lock.
     * @param token - The token to ensure the lock is held by.
     */
    ensureOwnership(
        token: string
    ): void {
        if (!this.isLocked()) {
            this.tryLock(token)
            return
        }
        if (this.getToken() !== token) {
            throw new UnrecoverableError("Lease already locked by another job")
        }
    }

    /**
     * Clear the lock state and cancel the lease timer.
     */
    private clear() {
        if (this.timer) clearTimeout(this.timer)
        this.timer = undefined
        this.token = null
    }
}