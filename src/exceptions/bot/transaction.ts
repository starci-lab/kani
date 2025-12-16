import { AbstractException } from "../abstract"

export class NoMoreTransactionsFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "No more transactions found", "NO_MORE_TRANSACTIONS_FOUND_EXCEPTION")
    }
}