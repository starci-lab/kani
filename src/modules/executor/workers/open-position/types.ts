import {
    AddTransactionRecordParams, ExecuteOpenPositionResult, OpenPositionPayload, PrepareOpenPositionResult
} from "@modules/blockchains"
import {
    DynamicLiquidityPoolStateCacheResult 
} from "@modules/cache"
import {
    BotSchema, JobSchema,
    LiquidityPoolSchema,
    TokenSchema
} from "@modules/databases"
import {
    Job
} from "bullmq"

/**
 * Data persisted/returned by open-position phases.
 *
 * - `openPositionTransaction` is produced by PREPARE and persisted on the Job document.
 * - `openPositionRecord` is produced by EXECUTE and consumed by CONFIRM for snapshot persistence.
 */
export interface OpenPositionJobData {
    openPositionTransaction: PrepareOpenPositionResult
    transactionRecord?: AddTransactionRecordParams
    executeResult?: ExecuteOpenPositionResult
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
    dynamicLiquidityPoolInfo: DynamicLiquidityPoolStateCacheResult

    /** Target token. */
    targetToken: TokenSchema

    /** Quote token. */
    quoteToken: TokenSchema

    /** Gas token. */
    gasToken: TokenSchema
}

export interface ProcessResult {
    result: OpenPositionJobData
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

export interface ExecuteParams extends ProcessParams {
    /** Output of prepare() (prepared open-position transaction + optional metadata). */
    prepareResult: OpenPositionJobData
}

export interface ExecuteResult {
    result: OpenPositionJobData
}

export interface ConfirmParams extends ProcessParams {
    /** Output of execute() (includes transactionRecords for snapshotting). */
    executeResult: OpenPositionJobData
}

export interface ConfirmResult {
    result: OpenPositionJobData
}