import type {
    MarketListingId,
} from "@modules/databases"
import type {
    Dayjs,
} from "dayjs"
import type {
    AggregatedTokenPriceTwapCacheResult,
} from "./cache-results/aggregated-token-price-twap"

/** Params for creating the initial TWAP cache result. */
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

/** Params for updating TWAP snapshot (id, price, marketListingId, intervalMs). */
export interface SetAggregatedTokenPriceTwapParams {
    id: string
    price: number
    marketListingId: MarketListingId
    intervalMs: number
}

/** Params for setting TWAP cache result. */
export interface SetAggregatedTokenPriceTwapCacheParams {
    id: string
    cacheResult: AggregatedTokenPriceTwapCacheResult
}
