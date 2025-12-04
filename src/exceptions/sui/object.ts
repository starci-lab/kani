import { AbstractException } from "../abstract"

export class TransactionObjectArgumentNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction object argument not found", "TRANSACTION_OBJECT_ARGUMENT_NOT_FOUND_EXCEPTION")
    }
}

