import {
    LiquidityPoolId,
} from "@modules/databases"
import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

/**
 * Open Position Job Executed Failed Exception Metadata
 */
export interface OpenPositionJobExecutedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

export class OpenPositionJobExecutedFailedException extends AbstractException {
    constructor(
        {
            originalError,
            botId,
            jobId,
            liquidityPoolId,
        }: OpenPositionJobExecutedFailedExceptionMetadata
    ) {
        super(
            "Open position job executed failed",
            "OPEN_POSITION_JOB_EXECUTED_FAILED",
            {
                originalError,
                botId,
                jobId,
                liquidityPoolId,
            }
        )
    }
}

/**
 * Close Position Job Executed Failed Exception Metadata
 */
export interface ClosePositionJobExecutedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

export class ClosePositionJobExecutedFailedException extends AbstractException {
    constructor(
        {
            originalError,
            botId,
            jobId,
            liquidityPoolId,
        }: ClosePositionJobExecutedFailedExceptionMetadata
    ) {
        super(
            "Close position job executed failed",
            "CLOSE_POSITION_JOB_EXECUTED_FAILED",
            {
                originalError,
                botId,
                jobId,
                liquidityPoolId,
            }
        )
    }
}

/**
 * Withdraw Job Executed Failed Exception Metadata
 */
export interface WithdrawJobExecutedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
}

export class WithdrawJobExecutedFailedException extends AbstractException {
    constructor(
        {
            originalError,
            botId,
            jobId,
        }: WithdrawJobExecutedFailedExceptionMetadata
    ) {
        super(
            "Withdraw job executed failed",
            "WITHDRAW_JOB_EXECUTED_FAILED",
            {
                originalError,
                botId,
                jobId,
            }
        )
    }
}

/**
 * Reconcile Balance Job Executed Failed Exception Metadata
 */
export interface ReconcileBalanceJobExecutedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
}

export class ReconcileBalanceJobExecutedFailedException extends AbstractException {
    constructor(
        {
            originalError,
            botId,
            jobId,
        }: ReconcileBalanceJobExecutedFailedExceptionMetadata
    ) {
        super(
            "Reconcile balance job executed failed",
            "RECONCILE_BALANCE_JOB_EXECUTED_FAILED",
            {
                originalError,
                botId,
                jobId,
            }
        )
    }
}
