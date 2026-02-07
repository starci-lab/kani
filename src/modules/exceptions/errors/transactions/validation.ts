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
    TransactionType 
} from "../../enums"

/** Thrown when transaction validation fails */
export interface TransactionValidationFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: LiquidityPoolId
    type: TransactionType
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
