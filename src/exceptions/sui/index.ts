/**
 * SUI Blockchain Exceptions
 * Errors related to SUI blockchain operations
 */

import { AbstractException } from "../abstract"

/** Thrown when coin argument is not found in transaction */
export class CoinArgumentNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Coin argument not found", "COIN_ARGUMENT_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when coin asset is not found */
export class CoinAssetNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Coin asset not found", "COIN_ASSET_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when quote cannot be found */
export class QuoteNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Quote not found", "QUOTE_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when transaction object argument is not found */
export class TransactionObjectArgumentNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction object argument not found", "TRANSACTION_OBJECT_ARGUMENT_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when transaction cannot be found */
export class TransactionNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction not found", "TRANSACTION_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when transaction simulation fails */
export class TransactionStimulateFailedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction stimulate failed", "TRANSACTION_STIMULATE_FAILED_EXCEPTION")
    }
}

/** Thrown when transaction event is not found */
export class TransactionEventNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction event not found", "TRANSACTION_EVENT_NOT_FOUND_EXCEPTION")
    }
}
