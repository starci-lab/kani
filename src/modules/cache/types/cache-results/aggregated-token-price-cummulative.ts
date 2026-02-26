import {
    Dayjs 
} from "dayjs"
import {
    AggregatedTokenPriceCacheResult 
} from "./aggregated-token-price"
import type {
    SnapshotCacheResult 
} from "./base"
import Decimal from "decimal.js"

/** Aggregated token price cummulative cache result. */
export interface AggregatedTokenPriceCummulativeCacheResult extends SnapshotCacheResult {
    // cummulative price means the price of the token at the current snapshot
    // cummulativePrice = cummulativePrice + Δt * price
    cummulativePrice: Decimal
    // last aggregated token price
    lastAggregatedTokenPrice: AggregatedTokenPriceCacheResult
    // start time of the cummulative price
    startAt: Dayjs
}