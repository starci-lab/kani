import {
    MarketListingId 
} from "@modules/databases"
import {
    Decimal 
} from "decimal.js"

/**
 * Write InfluxDB price bucket.
 */
export interface WriteInfluxdbPriceBucket {
    /** The token ID. */
    id: string
    /** The price. */
    price: Decimal
    /** Market listing ID. */
    marketListingId: MarketListingId
}