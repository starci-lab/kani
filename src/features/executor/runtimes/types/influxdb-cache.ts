import type {
    CexId,
    PricePoint,
    VolumePoint,
} from "@modules/databases"

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