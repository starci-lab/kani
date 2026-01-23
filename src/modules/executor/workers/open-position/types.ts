import {
    AddTransactionRecordParams, LiquidityPoolState, OpenPositionPayload, PrepareOpenPositionResult 
} from "@modules/blockchains"
import {
    BotSchema, JobSchema, 
    LiquidityPoolSchema
} from "@modules/databases"
import {
    Job 
} from "bullmq"

/**
 * Metadata persisted/returned by reconcile-balance phases.
 *
 * - `openPositionTransaction` is produced by PREPARE and persisted on the Job document.
 * - `openPositionRecord` is produced by EXECUTE and consumed by CONFIRM for snapshot persistence.
 */
export interface OpenPositionJobMetadata {
    openPositionTransaction: PrepareOpenPositionResult
    transactionRecords?: AddTransactionRecordParams
}

export interface ProcessParams {
    /**
     * Raw BullMQ job object (queue metadata, attempts, progress, etc.).
     * Note: actual business payload is stored in `bullmqJob.data` as SuperJSON.
     */
    bullmqJob: Job<string>

    /** Persisted job document (used for status transitions + metadata). */
    job: JobSchema

    /** Persisted bot document (holds tokens/chain config and active job state). */
    bot: BotSchema

    /** Deserialized reconcile-balance payload (botId/jobId + optional balances). */
    payload: OpenPositionPayload

    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema

    /** Liquidity pool state. */
    state: LiquidityPoolState
}

export interface ProcessResult {
    result: OpenPositionJobMetadata
}
/** Parameters for the PREPARE phase (same shape as ProcessParams). */
export type PrepareParams = ProcessParams
export type PrepareResult = ProcessResult

export interface OnFailedParams extends ProcessParams {
    /** The error thrown during processing (used for classification + logging). */
    error: Error
}

/** Parameters for onCompleted() (same shape as ProcessParams). */
export type OnCompletedParams = ProcessParams

/** Parameters for sendHeartbeat() (same shape as ProcessParams). */
export type SendHeartbeatParams = ProcessParams