/**
 * Transaction Stimulated Exceptions
 * Errors related to transaction devInspect / stimulation
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"
import {
    LiquidityPoolId,
} from "@modules/databases"
import {
    ErrorTransactionType,
} from "./types"

/** Thrown when transaction stimulation (devInspect) fails */
export interface TransactionStimulatedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: LiquidityPoolId
    type: ErrorTransactionType
}

export class TransactionStimulatedFailedException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            liquidityPoolId,
            originalError,
        }: TransactionStimulatedFailedExceptionMetadata
    ) {
        super(
            "Transaction stimulation failed",
            "TRANSACTION_STIMULATED_FAILED_EXCEPTION",
            {
                botId,
                txHash,
                liquidityPoolId,
                originalError,
            }
        )
    }
}
