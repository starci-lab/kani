/**
 * SUI Transaction/Quote Exceptions
 * Errors related to Sui transaction building, simulation and quote fetching.
 *
 * Rule: keep `index.ts` as a barrel only (no classes/imports), put exceptions in intent-named files.
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"
import BN from "bn.js"

/** Thrown when coin argument is not found in transaction */
export interface CoinArgumentNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    message?: string
}

export class CoinArgumentNotFoundException extends AbstractException {
    constructor(
        {
            message,
            originalError,
        }: CoinArgumentNotFoundExceptionMetadata
    ) {
        super(
            "Coin argument not found",
            "COIN_ARGUMENT_NOT_FOUND_EXCEPTION",
            {
                message,
                originalError,
            }
        )
    }
}

/** Thrown when coin asset is not found */
export class CoinAssetNotFoundException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata
    ) {
        super(
            "Coin asset not found",
            "COIN_ASSET_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when quote cannot be found */
export interface QuoteNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    from: string
    target: string
    amount: BN
}

export class QuoteNotFoundException extends AbstractException {
    constructor(
        {
            from,
            target,
            amount,
            originalError,
        }: QuoteNotFoundExceptionMetadata
    ) {
        super(
            "Quote not found",
            "QUOTE_NOT_FOUND_EXCEPTION",
            {
                from,
                target,
                amount: amount?.toString(),
                originalError,
            }
        )
    }
}

/** Thrown when transaction object argument is not found */
export class TransactionObjectArgumentNotFoundException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata
    ) {
        super(
            "Transaction object argument not found",
            "TRANSACTION_OBJECT_ARGUMENT_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when transaction cannot be found */
export class TransactionNotFoundException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata
    ) {
        super(
            "Transaction not found",
            "TRANSACTION_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when transaction simulation fails */
export class TransactionStimulateFailedException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata
    ) {
        super(
            "Transaction stimulate failed",
            "TRANSACTION_STIMULATE_FAILED_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when Sui object data is not found */
export class SuiObjectDataNotFoundException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata
    ) {
        super(
            "Sui object data not found",
            "SUI_OBJECT_DATA_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when Sui object tick lower is not found */
export class SuiObjectTickLowerNotFoundException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata
    ) {
        super(
            "Sui object tick lower not found",
            "SUI_OBJECT_TICK_LOWER_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when Sui object tick upper is not found */
export class SuiObjectTickUpperNotFoundException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata = {
        }
    ) {
        super(
            "Sui object tick upper not found",
            "SUI_OBJECT_TICK_UPPER_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when Sui object position is not found */
export class SuiObjectPositionNotFoundException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata
    ) {
        super(
            "Sui object position not found",
            "SUI_OBJECT_POSITION_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}
