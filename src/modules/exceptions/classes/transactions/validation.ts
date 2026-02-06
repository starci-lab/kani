/**
 * Transaction validation exceptions.
 * Errors related to transaction validation.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    LiquidityPoolId 
} from "@modules/databases"
import type {
    ErrorTransactionType 
} from "./types"

/** Thrown when transaction validation fails */
export interface TransactionValidationFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: LiquidityPoolId
    type: ErrorTransactionType
}

/** Thrown when transaction validation fails. */
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
