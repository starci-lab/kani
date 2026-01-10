/**
 * Miscellaneous Exceptions
 * General purpose exceptions
 */

import { AbstractException } from "../abstract"

/** Thrown when Privy public key is not found */
export class PrivyPublicKeyNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Privy public key not found", "PRIVY_PUBLIC_KEY_NOT_FOUND_EXCEPTION")
    }
}
