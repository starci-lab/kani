import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when KMS encryption fails */
export interface KmsEncryptionFailedExceptionMetadata extends AbstractExceptionMetadata {
    originalError: Error
}

/** Thrown when KMS encryption fails. */
export class KmsEncryptionFailedException extends AbstractException {
    constructor(
        { originalError }: KmsEncryptionFailedExceptionMetadata
    ) {
        super("KMS encryption failed",
            "KMS_ENCRYPTION_FAILED_EXCEPTION",
            {
                originalError,
            })
    }
}

/** Thrown when KMS decryption fails */
export interface KmsDecryptionFailedExceptionMetadata extends AbstractExceptionMetadata {
    originalError: Error
}

/** Thrown when KMS decryption fails. */
export class KmsDecryptionFailedException extends AbstractException {
    constructor(
        { originalError }: KmsDecryptionFailedExceptionMetadata
    ) {
        super("KMS decryption failed",
            "KMS_DECRYPTION_FAILED_EXCEPTION",
            {
                originalError,
            })
    }
}

/** Thrown when KMS encryption key not found */
export interface KmsKeyNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    kmsKeyName?: string
}

/** Thrown when KMS encryption key cannot be found. */
export class KmsEncryptionKeyNotFoundException extends AbstractException {
    constructor(
        { kmsKeyName }: KmsKeyNotFoundExceptionMetadata
    ) {
        super("KMS encryption key not found",
            "KMS_ENCRYPTION_KEY_NOT_FOUND_EXCEPTION",
            {
                kmsKeyName,
            }
        )
    }
}

/** Thrown when KMS decryption key not found */
export interface KmsCiphertextNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    kmsKeyName?: string
}

/** Thrown when KMS ciphertext cannot be found. */
export class KmsCiphertextNotFoundException extends AbstractException {
    constructor(
        { kmsKeyName }: KmsCiphertextNotFoundExceptionMetadata
    ) {
        super("KMS ciphertext not found",
            "KMS_CIPHERTEXT_NOT_FOUND_EXCEPTION",
            {
                kmsKeyName,
            }
        )
    }
}