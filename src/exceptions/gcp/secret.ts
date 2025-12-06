import { AbstractException } from "../abstract"

export class SecretNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Secret not found", "SECRET_NOT_FOUND_EXCEPTION")
    }
}