import { AbstractException } from "../abstract"

export class TransactionMessageTooLargeException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction message is too large", "TRANSACTION_MESSAGE_TOO_LARGE_EXCEPTION")
    }
}