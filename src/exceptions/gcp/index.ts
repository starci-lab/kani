/**
 * GCP Exceptions
 * Errors related to Google Cloud Platform services (KMS, Secret Manager)
 */

import { AbstractException } from "../abstract"

/** Thrown when KMS key cannot be found */
export class KmsNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Kms not found", "KMS_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when secret cannot be found in Secret Manager */
export class SecretNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Secret not found", "SECRET_NOT_FOUND_EXCEPTION")
    }
}
