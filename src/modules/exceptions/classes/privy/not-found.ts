/**
 * Privy exceptions.
 * Errors related to Privy operations.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when Privy public key is not found. */
export interface PrivyPublicKeyNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

/** Thrown when Privy public key cannot be found. */
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

/** Thrown when Privy wallet ID is not found */
export interface PrivyWalletIdNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

/** Thrown when Privy wallet ID cannot be found. */
export class PrivyWalletIdNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: PrivyWalletIdNotFoundExceptionMetadata
    ) {
        super(
            "Privy wallet ID not found",
            "PRIVY_WALLET_ID_NOT_FOUND_EXCEPTION",
            {
                botId, originalError 
            }
        )
    }
}

/** Throw when privy metadata is not found */
export interface PrivyMetadataNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

/** Thrown when Privy metadata cannot be found. */
export class PrivyMetadataNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: PrivyMetadataNotFoundExceptionMetadata
    ) {
        super(
            "Privy metadata not found",
            "PRIVY_METADATA_NOT_FOUND_EXCEPTION",
            {
                botId, originalError 
            }
        )
    }
}

/** Thrown when Privy encrypted signer private key is not found */
export interface EncryptedPrivySignerPrivateKeyNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

/** Thrown when encrypted Privy signer private key cannot be found. */
export class EncryptedPrivySignerPrivateKeyNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: EncryptedPrivySignerPrivateKeyNotFoundExceptionMetadata
    ) {
        super(
            "Encrypted Privy signer private key not found",
            "ENCRYPTED_PRIVY_SIGNER_PRIVATE_KEY_NOT_FOUND_EXCEPTION",
            {
                botId, originalError 
            }
        )
    }
}