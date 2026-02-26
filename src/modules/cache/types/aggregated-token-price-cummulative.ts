import type {
    MarketListingId,
} from "@modules/databases"
import {
    Dayjs 
} from "dayjs"

/** Params for setting aggregated token price in cache. */
export interface SetAggregatedTokenPriceCummulativeParams {
    id: string
    price: number
    marketListingId: MarketListingId
    // interval means the time between two elements
    intervalMs: number
}

/** Params for creating initial cache result. */
export interface CreateInitialCacheResultParams {
    /** The current time. */
    now: Dayjs
    /** The price of the token. */
    price: number
    /** The market listing id. */
    marketListingId: MarketListingId
}

/** Params for upserting the last price. */
export interface UpsertLastPriceParams {
    /** The current time. */
    now: Dayjs
    /** The price of the token. */
    price: number
    /** The market listing id. */
    marketListingId: MarketListingId
}