import { AbstractException } from "../abstract"

export class RedlockException extends AbstractException {
    constructor(message: string) {
        super(message, "RedlockException")
    }
}