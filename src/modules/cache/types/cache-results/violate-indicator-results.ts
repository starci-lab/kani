import {
    IndicatorStatus,
} from "../../enums"
import {
    SnapshotCacheResult,
} from "./base"
/** Single violate indicator result (status + timeWindowMs + metadata). */
export interface ViolateIndicatorResultEntry {
    status: IndicatorStatus
    timeWindowMs: number
    metadata: unknown
}

/** Cache result: per-bot array of violate indicator results (or null if calculator skipped). */
export interface ViolateIndicatorResultsCacheResult extends SnapshotCacheResult {
    results: Array<ViolateIndicatorResultEntry>
}
