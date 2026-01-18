/**
 * Privy Exceptions
 * Errors related to Privy operations
 */

import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when Privy public key is not found */
export interface PrivyPublicKeyNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}
export class PrivyPublicKeyNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: PrivyPublicKeyNotFoundExceptionMetadata
    ) {
        super(
            "Privy public key not found", 
            "PRIVY_PUBLIC_KEY_NOT_FOUND_EXCEPTION", 
            {
                botId, originalError 
            }
        )
    }
}
