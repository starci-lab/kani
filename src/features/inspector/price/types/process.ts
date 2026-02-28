import {
    MarketListingId 
} from "@modules/databases"

/**
 * Parameters for proccessing price window.
 */
export interface ProccessPriceWindowParams {
    /** The token ID. */
    id: string
    /** The interval in milliseconds. */
    intervalMs: number
    /** Market listing ID. */
    marketListingId: MarketListingId
}