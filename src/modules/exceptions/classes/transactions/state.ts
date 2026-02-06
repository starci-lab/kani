/**
 * Transaction state exceptions.
 * Errors related to transaction execution and preparation state.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    ErrorTransactionType 
} from "./types"
import type {
    LiquidityPoolId 
} from "@modules/databases"
/** Thrown when transaction has not been executed */
export interface TransactionNotExecutedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: LiquidityPoolId
    type: ErrorTransactionType
}

/** Thrown when transaction has not been executed. */
export class TransactionNotExecutedException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            liquidityPoolId,
            type,
            originalError,
        }: TransactionNotExecutedExceptionMetadata
    ) {
        super(
            "Transaction has not been executed",
            "TRANSACTION_NOT_EXECUTED_EXCEPTION",
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

/** Thrown when transaction has not been prepared */
export interface TransactionNotPreparedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: string
    type: ErrorTransactionType
}

/** Thrown when transaction has not been prepared. */
export class TransactionNotPreparedException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            liquidityPoolId,
            type,
            originalError,
        }: TransactionNotPreparedExceptionMetadata
    ) {
        super(
            "Transaction has not been prepared",
            "TRANSACTION_NOT_PREPARED_EXCEPTION",
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
