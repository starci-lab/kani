import type {
    SnapshotCacheResult,
} from "./base"

/** Single liquidity pool synced diagnostic readiness. */
export type LiquidityPoolSyncedDiagnosticReadinessResult = SnapshotCacheResult

/** Liquidity pools synced diagnostic readiness cache result. */
export interface LiquidityPoolsSyncedDiagnosticReadinessResult extends SnapshotCacheResult {
    results: Partial<Record<string, LiquidityPoolSyncedDiagnosticReadinessResult>>
}
