import type {
    Dayjs,
} from "dayjs"
import {
    AggregatedTokenPriceCacheResult,
} from "./aggregated-token-price"
import type {
    SnapshotCacheResult,
} from "./base"
import type Decimal from "decimal.js"

/** Single TWAP snapshot: price at a point in time (no cumulative). */
export interface TwapSnapshot {
    /** Price at the snapshot time. */
    price: Decimal
    /** Time of the snapshot. */
    snapshotAt: Dayjs
}

/** Aggregated token price TWAP cache result. */
export interface AggregatedTokenPriceTwapCacheResult extends SnapshotCacheResult {
    /** Rolling TWAP snapshots (pruned by maxSnapshots). */
    snapshots: Array<TwapSnapshot>
    /** Last aggregated token price (always up to date). */
    lastAggregatedTokenPrice: AggregatedTokenPriceCacheResult
}

/** @deprecated Use AggregatedTokenPriceTwapCacheResult */
export type AggregatedTokenPriceCummulativeCacheResult = AggregatedTokenPriceTwapCacheResult