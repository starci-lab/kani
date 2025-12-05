import { AbstractException } from "../abstract"

export class TransactionNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction not found", "TRANSACTION_NOT_FOUND_EXCEPTION")
    }
}

export class TransactionStimulateFailedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction stimulate failed", "TRANSACTION_STIMULATE_FAILED_EXCEPTION")
    }
}

export class TransactionEventNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction event not found", "TRANSACTION_EVENT_NOT_FOUND_EXCEPTION")
    }
}