import { AbstractException } from "../abstract"

export class TimeoutException extends AbstractException {
    constructor(message?: string) {
        super(message || "Timeout", "TIMEOUT_EXCEPTION")
    }
}