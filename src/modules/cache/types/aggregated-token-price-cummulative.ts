import type {
    MarketListingId,
} from "@modules/databases"
import type {
    Dayjs,
} from "dayjs"
import type {
    AggregatedTokenPriceCummulativeCacheResult,
} from "./cache-results/aggregated-token-price-cummulative"

/** Params for creating the initial cummulative cache result. */
export interface CreateInitialCacheResultParams {
    now: Dayjs
    price: number
    marketListingId: MarketListingId
}

/** Params for upserting the last price in the aggregated map. */
export interface UpsertLastPriceParams {
    now: Dayjs
    price: number
    marketListingId: MarketListingId
}

/** Params for setting aggregated token price in cache. */
export interface SetAggregatedTokenPriceCummulativeParams {
    id: string
    /** The price of the token. */
    price: number
    /** The market listing id. */
    marketListingId: MarketListingId
    /** The interval in milliseconds. */
    intervalMs: number
}

/** Params for setting aggregated token price cummulative in cache. */
export interface SetAggregatedTokenPriceCummulativeCacheParams {
    /** The id of the aggregated token price cummulative. */
    id: string
    /** The cache result of the aggregated token price cummulative. */
    cacheResult: AggregatedTokenPriceCummulativeCacheResult
}