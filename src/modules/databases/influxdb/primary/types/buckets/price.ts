import {
    CexId,
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
    /** CEX ID (for CEX price sources). */
    cexId: CexId
}

/**
 * Query InfluxDB price bucket.
 */
export interface QueryInfluxdbPriceBucketAsyncIteratorParams {
    /** The token ID. */
    id: string
    /** The interval in milliseconds. */
    intervalMs: number
    /** CEX ID. */
    cexId: CexId
}

/**
 * Query InfluxDB price bucket.
 */
export type QueryInfluxdbPriceBucketPromiseParams = QueryInfluxdbPriceBucketAsyncIteratorParams

/**
 * Price point from InfluxDB.
 */
export interface PricePoint {
    id: string
    cex_id: CexId
    price: number
    time: number
}
