import {
    LiquidityPoolId 
} from "@modules/databases"
import {
    AbstractException,
    AbstractExceptionMetadata 
} from "../abstract"

/**
 * Open Position Job Prepared Failed Exception Metadata
 */
export interface OpenPositionJobPreparedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

export class OpenPositionJobPreparedFailedException extends AbstractException {
    constructor(
        {
            originalError,
            botId,
            jobId,
            liquidityPoolId,
        }: OpenPositionJobPreparedFailedExceptionMetadata
    ) {
        super(
            "Open position job prepared failed",
            "OPEN_POSITION_JOB_PREPARED_FAILED",
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
 * Reconcile Balance Job Prepared Failed Exception Metadata
 */
export interface ReconcileBalanceJobPreparedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
}

export class ReconcileBalanceJobPreparedFailedException extends AbstractException {
    constructor(
        {
            originalError,
            botId,
            jobId,
        }: ReconcileBalanceJobPreparedFailedExceptionMetadata
    ) {
        super(
            "Reconcile balance job prepared failed",
            "RECONCILE_BALANCE_JOB_PREPARED_FAILED",
            {
                originalError,
                botId,
                jobId,
            }
        )
    }
}

/**
 * Close Position Job Prepared Failed Exception Metadata
 */
export interface ClosePositionJobPreparedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId?: LiquidityPoolId
}

export class ClosePositionJobPreparedFailedException extends AbstractException {
    constructor(
        {
            originalError, 
            botId,
            jobId,
            liquidityPoolId,
        }: ClosePositionJobPreparedFailedExceptionMetadata
    ) {
        super(
            "Close position job prepared failed",
            "CLOSE_POSITION_JOB_PREPARED_FAILED",
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
 * Close Position Job Prepared Failed Exception Metadata
 */
export interface WithdrawJobPreparedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
}

export class WithdrawJobPreparedFailedException extends AbstractException {
    constructor(
        {
            originalError,
            botId,
            jobId,
        }: WithdrawJobPreparedFailedExceptionMetadata
    ) {
        super(
            "Withdraw job prepared failed",
            "WITHDRAW_JOB_PREPARED_FAILED",
            {
                originalError,
                botId,
                jobId,
            }
        )
    }
}