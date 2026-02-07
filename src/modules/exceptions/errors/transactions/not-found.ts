/**
 * Transaction not-found exceptions.
 * Errors related to missing transaction events.
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

/** Thrown when transaction event is not found */
export interface TransactionEventNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    eventType: string
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when transaction event is not found. */
export class TransactionEventNotFoundException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            eventType,
            originalError,
        }: TransactionEventNotFoundExceptionMetadata
    ) {
        super(
            "Transaction event not found",
            "TRANSACTION_EVENT_NOT_FOUND_EXCEPTION",
            {
                botId,
                txHash,
                eventType,
                originalError,
            }
        )
    }
}

/** Thrown when output coin is not found after swap */
export interface OutputCoinNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    type: TransactionType
}

/** Metadata for prepare open position result not found. */
export interface PrepareOpenPositionResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when prepare open position result is null or undefined after prepare. */
export class PrepareOpenPositionResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
        liquidityPoolId,
    }: PrepareOpenPositionResultNotFoundExceptionMetadata) {
        super(
            "Prepare open position result not found",
            "PREPARE_OPEN_POSITION_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
                jobId,
                liquidityPoolId,
            },
        )
    }
}

/** Metadata for execute open position result not found. */
export interface ExecuteOpenPositionResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when execute open position result is null or undefined after execute. */
export class ExecuteOpenPositionResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
        liquidityPoolId,
    }: ExecuteOpenPositionResultNotFoundExceptionMetadata) {
        super(
            "Execute open position result not found",
            "EXECUTE_OPEN_POSITION_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
                jobId,
                liquidityPoolId,
            },
        )
    }
}

/** Metadata for prepare reconcile balance transaction result not found. */
export interface PrepareReconcileBalanceTransactionResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
}

/** Thrown when prepare reconcile balance transaction result is null or undefined after prepare. */
export class PrepareReconcileBalanceTransactionResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
    }: PrepareReconcileBalanceTransactionResultNotFoundExceptionMetadata) {
        super(
            "Prepare reconcile balance transaction result not found",
            "PREPARE_RECONCILE_BALANCE_TRANSACTION_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
                jobId,
            },
        )
    }
}

/** Metadata for execute reconcile balance transaction result not found. */
export interface ExecuteReconcileBalanceTransactionResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
}

/** Thrown when execute reconcile balance transaction result is null or undefined after execute. */
export class ExecuteReconcileBalanceTransactionResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
    }: ExecuteReconcileBalanceTransactionResultNotFoundExceptionMetadata) {
        super(
            "Execute reconcile balance transaction result not found",
            "EXECUTE_RECONCILE_BALANCE_TRANSACTION_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
                jobId,
            },
        )
    }
}

/** Metadata for prepare close position result not found. */
export interface PrepareClosePositionResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when prepare close position result is null or undefined after prepare. */
export class PrepareClosePositionResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
        liquidityPoolId,
    }: PrepareClosePositionResultNotFoundExceptionMetadata) {
        super(
            "Prepare close position result not found",
            "PREPARE_CLOSE_POSITION_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
                jobId,
                liquidityPoolId,
            },
        )
    }
}

/** Metadata for execute close position result not found. */
export interface ExecuteClosePositionResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when execute close position result is null or undefined after execute. */
export class ExecuteClosePositionResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
        liquidityPoolId,
    }: ExecuteClosePositionResultNotFoundExceptionMetadata) {
        super(
            "Execute close position result not found",
            "EXECUTE_CLOSE_POSITION_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
                jobId,
                liquidityPoolId,
            },
        )
    }
}

/** Metadata for prepare withdraw transaction result not found. */
export interface PrepareWithdrawTransactionResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
}

/** Thrown when prepare withdraw transaction result is null or undefined after prepare. */
export class PrepareWithdrawTransactionResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
    }: PrepareWithdrawTransactionResultNotFoundExceptionMetadata) {
        super(
            "Prepare withdraw transaction result not found",
            "PREPARE_WITHDRAW_TRANSACTION_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
                jobId,
            },
        )
    }
}

/** Metadata for execute withdraw transaction result not found. */
export interface ExecuteWithdrawTransactionResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
}

/** Thrown when execute withdraw transaction result is null or undefined after execute. */
export class ExecuteWithdrawTransactionResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
    }: ExecuteWithdrawTransactionResultNotFoundExceptionMetadata) {
        super(
            "Execute withdraw transaction result not found",
            "EXECUTE_WITHDRAW_TRANSACTION_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
                jobId,
            },
        )
    }
}

/** Thrown when output coin is not found after swap. */
export class OutputCoinNotFoundException extends AbstractException {
    constructor({
        botId,
        type,
        originalError,
    }: OutputCoinNotFoundExceptionMetadata) {
        super(
            "Output coin not found",
            "OUTPUT_COIN_NOT_FOUND_EXCEPTION",
            {
                botId,
                type,
                originalError,
            },
        )
    }
}
