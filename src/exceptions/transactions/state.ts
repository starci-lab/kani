/**
 * Transaction State Exceptions
 * Errors related to transaction execution and preparation state
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"
import {
    LiquidityPoolId,
} from "@modules/databases"

/** Thrown when transaction has not been executed */
export interface TransactionNotExecutedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export class TransactionNotExecutedException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            liquidityPoolId,
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
                originalError,
            }
        )
    }
}

/** Thrown when transaction has not been prepared */
export interface TransactionNotPreparedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export class TransactionNotPreparedException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            liquidityPoolId,
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
                originalError,
            }
        )
    }
}
