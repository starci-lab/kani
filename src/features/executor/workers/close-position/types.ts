import {
    AddTransactionRecordParams,
    ClosePositionPayload,
    PrepareClosePositionResult,
} from "@modules/blockchains"
import {
    DynamicLiquidityPoolInfoCacheResult 
} from "@modules/cache"
import {
    BotSchema,
    JobSchema,
    LiquidityPoolSchema,
    TokenSchema
} from "@modules/databases"
import {
    Job
} from "bullmq"

/**
 * Metadata persisted/returned by close-position phases.
 *
 * - `closePositionTransaction` is produced by PREPARE and persisted on the Job document.
 * - `transactionRecords` is produced by EXECUTE and consumed by CONFIRM for snapshot persistence.
 */
export interface ClosePositionJobData {
    closePositionTransaction: PrepareClosePositionResult
    /** Transaction records to snapshot in CONFIRM (one per tx hash) */
    transactionRecords?: Array<AddTransactionRecordParams>
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

    /** Deserialized close-position payload (botId/jobId + liquidityPoolId). */
    payload: ClosePositionPayload

    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema

    /** Liquidity pool state. */
    dynamicLiquidityPoolInfo: DynamicLiquidityPoolInfoCacheResult

    /** Target token. */
    targetToken: TokenSchema

    /** Quote token. */
    quoteToken: TokenSchema

    /** Gas token. */
    gasToken: TokenSchema
}

export interface ProcessResult {
    result: ClosePositionJobData
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
    /** Output of prepare() (prepared close-position transaction + optional metadata). */
    prepareResult: ClosePositionJobData
}

export interface ExecuteResult {
    result: ClosePositionJobData
}

export interface ConfirmParams extends ProcessParams {
    /** Output of execute() (includes transactionRecords for snapshotting). */
    executeResult: ClosePositionJobData
}

export interface ConfirmResult {
    result: ClosePositionJobData
}