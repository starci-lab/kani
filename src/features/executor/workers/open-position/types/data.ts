import type {
    ExecuteOpenPositionResult,
    PrepareOpenPositionResult,
} from "@modules/blockchains"

/**
 * Data persisted/returned by open-position phases.
 *
 * - `prepareResult` is produced by PREPARE and persisted on the Job document.
 * - `executeResult` is produced by EXECUTE and persisted on the Job document.
 */
export interface OpenPositionJobData {
    prepareResult: PrepareOpenPositionResult
    executeResult: ExecuteOpenPositionResult
}
