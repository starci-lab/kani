import { AbstractException } from "../abstract"

export class KmsNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Kms not found", "KMS_NOT_FOUND_EXCEPTION")
    }
}