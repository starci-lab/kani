import type {
    Dayjs,
} from "dayjs"
import {
    AggregatedTokenPriceCacheResult,
} from "./aggregated-token-price"
import type {
    SnapshotCacheResult,
} from "./base"
import Decimal from "decimal.js"

/** Single TWAP snapshot: prices by market listing at a point in time. */
export interface TwapSnapshot {
    /** Cummulative price of the token at the snapshot time. */
    cummulativePrice: Decimal
    /** Time of the snapshot. */
    snapshotAt: Dayjs
}

/** Aggregated token price cummulative cache result. */
export interface AggregatedTokenPriceCummulativeCacheResult extends SnapshotCacheResult {
    /** Rolling TWAP snapshots (pruned by maxSnapshots). */
    snapshots: Array<TwapSnapshot>
    /** Last aggregated token price (always up to date). */
    lastAggregatedTokenPrice: AggregatedTokenPriceCacheResult
}