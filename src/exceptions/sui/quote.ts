import { AbstractException } from "../abstract"

export class QuoteNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Quote not found", "QUOTE_NOT_FOUND_EXCEPTION")
    }
}