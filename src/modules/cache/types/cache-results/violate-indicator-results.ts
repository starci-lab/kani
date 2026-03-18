import {
    IndicatorStatus,
} from "../../enums"
import {
    SnapshotCacheResult,
} from "./base"
/** Record of a violate indicator result. */
export interface IndicatorRecord {
    time: number
    value: number
}
/** Single violate indicator result (status + timeWindowMs + metadata). */
export interface ViolateIndicatorResultEntry {
    id: string
    status: IndicatorStatus
    timeWindowMs: number
    metadata: unknown
    records: Array<IndicatorRecord>
}

/** Cache result: per-bot array of violate indicator results (or null if calculator skipped). */
export interface ViolateIndicatorResultsCacheResult extends SnapshotCacheResult {
    results: Array<ViolateIndicatorResultEntry>
}
