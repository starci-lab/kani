import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when KMS encryption fails */
export interface KmsEncryptionFailedExceptionMetadata extends AbstractExceptionMetadata {
    originalError: Error
}
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