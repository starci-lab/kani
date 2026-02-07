import type {
    AddTransactionRecordParams,
    PrepareWithdrawTransactionResult,
} from "@modules/blockchains"

/**
 * Data persisted/returned by withdraw phases.
 *
 * - `withdrawTransaction` is produced by PREPARE and persisted on the Job document.
 * - `transactionRecords` is produced by EXECUTE and consumed by CONFIRM for snapshot persistence.
 */
export interface WithdrawJobData {
    withdrawTransaction: PrepareWithdrawTransactionResult
    transactionRecords?: Array<AddTransactionRecordParams>
}
