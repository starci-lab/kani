/**
 * Privy Exceptions
 * Errors related to Privy operations
 */

import { AbstractException } from "../abstract"

/** Thrown when Privy public key is not found */
export interface PrivyPublicKeyNotFoundExceptionMetadata {
    botId: string
}
export class PrivyPublicKeyNotFoundException extends AbstractException {
    constructor(
        { botId }: PrivyPublicKeyNotFoundExceptionMetadata
    ) {
        super(
            "PRIVY_PUBLIC_KEY_NOT_FOUND_EXCEPTION", 
            "PRIVY_PUBLIC_KEY_NOT_FOUND_EXCEPTION", { botId })
    }
}
