import {
    AbstractException 
} from "../abstract"
import type {
    LiquidityPoolId 
} from "@modules/databases"
import type {
    CannotOpenPositionEnqueueJobReason,
    CannotReconcileBalanceEnqueueJobReason,
    CannotClosePositionEnqueueJobReason,
} from "../../enums"
import type {
    AbstractExceptionMetadata 
} from "../abstract"

export interface CannotOpenPositionEnqueueJobExceptionMetadata extends AbstractExceptionMetadata {
    jobId: string
    botId: string
    liquidityPoolId: LiquidityPoolId
    reason: CannotOpenPositionEnqueueJobReason
    error?: string
}

/** Thrown when open position job cannot be enqueued. */
export class CannotEnqueueOpenPositionJobException extends AbstractException {
    constructor(
        {
            jobId,
            botId,
            liquidityPoolId,
            reason,
            error,
        }: CannotOpenPositionEnqueueJobExceptionMetadata,
    ) {
        super(
            "Cannot enqueue open position job",
            "CANNOT_ENQUEUE_OPEN_POSITION_JOB",
            {
                jobId,
                botId,
                liquidityPoolId,
                reason,
                error,
            },
        )
    }
}

export interface CannotReconcileBalanceEnqueueJobExceptionMetadata extends AbstractExceptionMetadata {
    jobId: string
    botId: string
    reason: CannotReconcileBalanceEnqueueJobReason
    error?: string
    /** Original error name (e.g. JobIdAlreadyExistsError) */
    errorName?: string
    /** Original error stack (for debugging) */
    errorStack?: string
}

/** Thrown when reconcile balance job cannot be enqueued. */
export class CannotEnqueueReconcileBalanceJobException extends AbstractException {
    constructor(
        {
            jobId,
            botId,
            reason,
            error,
            errorName,
            errorStack,
        }: CannotReconcileBalanceEnqueueJobExceptionMetadata
    ) {
        super(
            "Cannot enqueue reconcile balance job", 
            "CANNOT_ENQUEUE_RECONCILE_BALANCE_JOB", 
            {
                jobId,
                botId,
                reason,
                error,
                errorName,
                errorStack,
            }
        )
    }
}

export interface CannotClosePositionEnqueueJobExceptionMetadata extends AbstractExceptionMetadata {
    jobId: string
    botId: string
    liquidityPoolId: LiquidityPoolId
    reason: CannotClosePositionEnqueueJobReason
    error?: string
    settleReason?: string
}

/** Thrown when close position job cannot be enqueued. */
export class CannotEnqueueClosePositionJobException extends AbstractException {
    constructor(
        {
            jobId,
            botId,
            liquidityPoolId,
            reason,
            error,
            settleReason,
        }: CannotClosePositionEnqueueJobExceptionMetadata,
    ) {
        super(
            "Cannot enqueue close position job",
            "CANNOT_ENQUEUE_CLOSE_POSITION_JOB",
            {
                jobId,
                botId,
                liquidityPoolId,
                reason,
                error,
                settleReason,
            },
        )
    }
}