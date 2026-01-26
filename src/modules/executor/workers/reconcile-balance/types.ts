import {
    Job 
} from "bullmq"
import {
    JobSchema, BotSchema
} from "@modules/databases"
import {
    AddTransactionRecordParams,
    PrepareSwapTransactionResult,
    ReconcileBalancePayload 
} from "@modules/blockchains"

/**
 * Data persisted/returned by reconcile-balance phases.
 *
 * - `swapTransactions` is produced by PREPARE and persisted on the Job document.
 * - `transactionRecords` is produced by EXECUTE and consumed by CONFIRM for snapshot persistence.
 */
export interface ReconcileBalanceJobData {
    swapTransactions: Array<PrepareSwapTransactionResult>
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

    /** Deserialized reconcile-balance payload (botId/jobId + optional balances). */
    payload: ReconcileBalancePayload
}

export interface ProcessResult {
    result: ReconcileBalanceJobData
}

/** Parameters for the PREPARE phase (same shape as ProcessParams). */
export type PrepareParams = ProcessParams
export type PrepareResult = ProcessResult
export interface ExecuteParams extends ProcessParams {
    /** Output of prepare() (prepared swap transactions + optional metadata). */
    prepareResult: ReconcileBalanceJobData
}
export type ExecuteResult = ProcessResult

/** Parameters for sendHeartbeat() (same shape as ProcessParams). */
export type SendHeartbeatParams = ProcessParams

export interface ConfirmParams extends ProcessParams {
    /** Output of execute() (includes transactionRecords for snapshotting). */
    executeResult: ReconcileBalanceJobData
}

export interface OnFailedParams extends ProcessParams {
    /** The error thrown during processing (used for classification + logging). */
    error: Error
}

/** Parameters for onCompleted() (same shape as ProcessParams). */
export type OnCompletedParams = ProcessParams