import type {
    AddTransactionRecordParams,
    PrepareClosePositionResult,
} from "@modules/blockchains"

/**
 * Data persisted/returned by close-position phases.
 *
 * - `closePositionTransaction` is produced by PREPARE and persisted on the Job document.
 * - `transactionRecords` is produced by EXECUTE and consumed by CONFIRM for snapshot persistence.
 */
export interface ClosePositionJobData {
    closePositionTransaction: PrepareClosePositionResult
    /** Transaction records to snapshot in CONFIRM (one per tx hash). */
    transactionRecords?: Array<AddTransactionRecordParams>
}
