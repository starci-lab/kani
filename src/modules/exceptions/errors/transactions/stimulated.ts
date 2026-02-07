/**
 * Transaction stimulated exceptions.
 * Errors related to transaction devInspect / stimulation.
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

/** Thrown when transaction stimulation (devInspect) fails */
export interface TransactionStimulatedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: LiquidityPoolId
    type: TransactionType
}

/** Thrown when transaction stimulation (devInspect) fails. */
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
