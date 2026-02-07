import type {
    PrepareClosePositionResult,
    ExecuteClosePositionResult,
} from "@modules/blockchains"

/**
 * Data persisted/returned by close-position phases.
 *
 * - `prepareResult` is produced by PREPARE and persisted on the Job document.
 * - `executeResult` is produced by EXECUTE and consumed by CONFIRM for snapshot persistence.
 */
export interface ClosePositionJobData {
    prepareResult: PrepareClosePositionResult
    executeResult: ExecuteClosePositionResult
}
