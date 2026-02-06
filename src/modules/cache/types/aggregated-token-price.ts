import type {
    MarketListingId 
} from "@modules/databases"

/** Params for setting aggregated token price in cache. */
export interface SetAggregatedTokenPriceParams {
    id: string
    price: number
    marketListingId: MarketListingId
}
