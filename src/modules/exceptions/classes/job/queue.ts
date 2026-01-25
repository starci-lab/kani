import {
    LiquidityPoolId 
} from "@modules/databases"
import {
    AbstractException 
} from "../abstract"

/**
 * Cannot Enqueue Job Exception Metadata
 */
export enum CannotOpenPositionEnqueueJobReason {
    AlreadyInQueue = "alreadyInQueue",
    RuntimeError = "runtimeError",
}
export interface CannotOpenPositionEnqueueJobExceptionMetadata {
    jobId: string
    botId: string
    liquidityPoolId: LiquidityPoolId
    reason: CannotOpenPositionEnqueueJobReason
    error?: string
}
export class CannotEnqueueOpenPositionJobException extends AbstractException {
    constructor(
        { jobId, botId, liquidityPoolId, reason, error }: CannotOpenPositionEnqueueJobExceptionMetadata
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
            }
        )
    }
}

/**
 * Cannot Enqueue Reconcile Balance Job Exception
 */
export enum CannotReconcileBalanceEnqueueJobReason {
    AlreadyInQueue = "alreadyInQueue",
    RuntimeError = "runtimeError",
}
export interface CannotReconcileBalanceEnqueueJobExceptionMetadata {
    jobId: string
    botId: string
    reason: CannotReconcileBalanceEnqueueJobReason
    error?: string
}
export class CannotEnqueueReconcileBalanceJobException extends AbstractException {
    constructor(
        { jobId, botId, reason, error }: CannotReconcileBalanceEnqueueJobExceptionMetadata
    ) {
        super(
            "Cannot enqueue reconcile balance job", 
            "CANNOT_ENQUEUE_RECONCILE_BALANCE_JOB", 
            {
                jobId,
                botId,
                reason,
                error,
            }
        )
    }
}