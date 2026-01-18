/**
 * Transaction Validation Exceptions
 * Errors related to transaction validation
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"
import {
    LiquidityPoolId,
} from "@modules/databases"

/** Thrown when transaction validation fails */
export interface TransactionValidationFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export class TransactionValidationFailedException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            liquidityPoolId,
            originalError,
        }: TransactionValidationFailedExceptionMetadata
    ) {
        super(
            "Transaction validation failed",
            "TRANSACTION_VALIDATION_FAILED_EXCEPTION",
            {
                botId,
                txHash,
                liquidityPoolId,
                originalError,
            }
        )
    }
}
