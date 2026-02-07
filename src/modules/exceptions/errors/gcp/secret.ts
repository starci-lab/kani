/**
 * GCP Secret Exceptions
 * Errors related to Google Cloud Secret Manager operations
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when secret cannot be found in Secret Manager */
export interface SecretNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    secretName?: string
}

/** Thrown when secret is not found. */
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

/** Thrown when secret creation fails. */
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