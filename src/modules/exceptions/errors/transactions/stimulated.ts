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
    LiquidityPoolId,
    TransactionType
} from "@modules/databases"
import type {
    ChainId 
} from "@modules/common"

/** Thrown when transaction stimulation (devInspect) fails */
export interface TransactionStimulatedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: LiquidityPoolId
    type: TransactionType
    chainId: ChainId
}

/** Thrown when transaction stimulation (devInspect) fails. */
export class TransactionStimulatedFailedException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            liquidityPoolId,
            originalError,
            chainId,
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
                chainId,
            }
        )
    }
}
