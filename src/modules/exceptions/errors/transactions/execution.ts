/**
 * Transaction execution exceptions.
 * Errors related to transaction execution on-chain.
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

/** Thrown when transaction execution fails on-chain */
export interface TransactionExecutionFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: LiquidityPoolId
    type?: TransactionType
}

/** Thrown when transaction execution fails on-chain. */
export class TransactionExecutionFailedException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            liquidityPoolId,
            type,
            originalError,
        }: TransactionExecutionFailedExceptionMetadata
    ) {
        super(
            "Transaction execution failed",
            "TRANSACTION_EXECUTION_FAILED_EXCEPTION",
            {
                botId,
                txHash,
                liquidityPoolId,
                type,
                originalError,
            }
        )
    }
}
