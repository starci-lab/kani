import { AbstractException } from "../abstract"

export class TransactionNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction not found", "TRANSACTION_NOT_FOUND_EXCEPTION")
    }
}