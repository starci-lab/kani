import type {
    CexId,
    PricePoint,
    VolumePoint,
} from "@modules/databases"

/** Time window for filtering points (milliseconds). */
export interface TimeInterval {
    /** Start time (ms). */
    startMs: number
    /** End time (ms). */
    endMs: number
}

/** Params for getting cached price or volume points by token, CEX, and time window. */
export interface GetPointsParams {
    /** Token ID. */
    tokenId: string
    /** CEX ID. */
    cexId: CexId
    /** Time window to filter points. */
    timeInterval: TimeInterval
}

/** Result of getting cached price points. */
export type GetPricePointsResult = Array<PricePoint>

/** Result of getting cached volume points. */
export type GetVolumePointsResult = Array<VolumePoint>

/**
 * InfluxDB price cache entry.
 */
export interface InfluxdbPriceCache {
    /** The token ID. */
    tokenId: string
    /** The price points. */
    points: Array<PricePoint>
    /** The CEX ID. */
    cexId: CexId
}

/**
 * InfluxDB volume cache entry.
 */
export interface InfluxdbVolumeCache {
    /** The token ID. */
    tokenId: string
    /** The volume points. */
    points: Array<VolumePoint>
    /** The CEX ID. */
    cexId: CexId
}