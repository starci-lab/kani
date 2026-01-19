/**
 * GCP Secret Exceptions
 * Errors related to Google Cloud Secret Manager operations
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

/** Thrown when secret cannot be found in Secret Manager */
export interface SecretNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    secretName?: string
}

export class SecretNotFoundException extends AbstractException {
    constructor(
        {
            secretName,
            originalError,
        }: SecretNotFoundExceptionMetadata = {
        }
    ) {
        super(
            secretName ? `Secret not found: ${secretName}` : "Secret not found",
            "SECRET_NOT_FOUND_EXCEPTION",
            {
                secretName,
                originalError,
            }
        )
    }
}

/** Thrown when secret cannot be created in Secret Manager */
export interface SecretCreationFailedExceptionMetadata extends AbstractExceptionMetadata {
    secretName?: string
}
export class SecretCreationFailedException extends AbstractException {
    constructor(
        { secretName, originalError }: SecretCreationFailedExceptionMetadata
    ) {
        super("Secret creation failed",
            "SECRET_CREATION_FAILED_EXCEPTION",
            {
                secretName, originalError,
            }
        )
    }
}