/**
 * Redlock Exceptions
 * Errors related to distributed locking
 */

import { AbstractException } from "../abstract"

/** Thrown when distributed lock operation fails */
export class RedlockException extends AbstractException {
    constructor(message: string) {
        super(message, "REDLOCK_EXCEPTION")
    }
}
