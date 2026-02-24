import type {
    MarketListingId,
} from "@modules/databases"

/** Params for setting aggregated token price in cache. */
export interface PushAggregatedTokenPriceArrayParams {
    id: string
    price: number
    marketListingId: MarketListingId
}
