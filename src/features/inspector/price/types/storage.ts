import {
    MarketListingId 
} from "@modules/databases"

/**
 * Parameters for storing price points.
 */
export interface QueryAndStoreParams {
    /** The token ID. */
    id: string
    /** The interval in milliseconds. */
    intervalMs: number
    /** Market listing ID. */
    marketListingId: MarketListingId
}
