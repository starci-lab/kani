import {
    MarketListingId 
} from "@modules/databases"
import {
    Decimal 
} from "decimal.js"

/**
 * Write InfluxDB price bucket.
 */
export interface WriteInfluxdbPriceBucketParams {
    /** The token ID. */
    id: string
    /** The price. */
    price: Decimal
    /** Market listing ID. */
    marketListingId: MarketListingId
}

/**
 * Query InfluxDB price bucket.
 */
export interface QueryInfluxdbPriceBucketAsyncIteratorParams {
    /** The token ID. */
    id: string
    /** The interval in milliseconds. */
    intervalMs: number
    /** Market listing ID. */
    marketListingId: MarketListingId
}

/**
 * Query InfluxDB price bucket.
 */
export type QueryInfluxdbPriceBucketPromiseParams = QueryInfluxdbPriceBucketAsyncIteratorParams

/**
 * Price point.
 */
export interface PricePoint {
    id: string
    market_listing_id: MarketListingId
    price: number
    time: number
}