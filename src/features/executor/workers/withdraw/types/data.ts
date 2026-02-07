import type {
    PrepareWithdrawTransactionResult, ExecuteWithdrawTransactionResult 
} from "@modules/blockchains"

/**
 * Data persisted/returned by withdraw phases.
 *
 * - `prepareResult` is produced by PREPARE and persisted on the Job document.
 * - `executeResult` is produced by EXECUTE and consumed by CONFIRM for snapshot persistence.
 */
export interface WithdrawJobData {
    prepareResult: PrepareWithdrawTransactionResult
    executeResult: ExecuteWithdrawTransactionResult
}
