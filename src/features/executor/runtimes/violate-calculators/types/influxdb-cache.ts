import type {
    CexId,
    PricePoint,
    VolumePoint,
} from "@modules/databases"

/** Params for getting cached price or volume points by token, CEX, and time window. */
export interface GetPointsParams {
    /** Token ID. */
    tokenId: string
    /** CEX ID. */
    cexId: CexId
    /** Time window in milliseconds to filter points. */
    timeIntervalMs: number
    /** Snapshot time in milliseconds. */
    snapshotMs?: number
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
