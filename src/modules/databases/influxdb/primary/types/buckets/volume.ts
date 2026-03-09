import {
    CexId,
} from "@modules/databases"
import {
    Decimal
} from "decimal.js"

/**
 * Write InfluxDB volume bucket.
 */
export interface WriteInfluxdbVolumeBucketParams {
    /** The token ID. */
    id: string
    /** The volume. */
    volume: Decimal
    /** CEX ID (for CEX volume sources). */
    cexId: CexId
}

/**
 * Query InfluxDB volume bucket.
 */
export interface QueryInfluxdbVolumeBucketAsyncIteratorParams {
    /** The token ID. */
    id: string
    /** The interval in milliseconds. */
    intervalMs: number
    /** CEX ID. */
    cexId: CexId
}

/**
 * Query InfluxDB volume bucket.
 */
export type QueryInfluxdbVolumeBucketPromiseParams = QueryInfluxdbVolumeBucketAsyncIteratorParams

/**
 * Volume point from InfluxDB.
 */
export interface VolumePoint {
    id: string
    cex_id: CexId
    volume: number
    time: number
}
