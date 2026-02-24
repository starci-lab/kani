import type {
    MarketListingId,
} from "@modules/databases"
import type {
    SnapshotCacheResult,
} from "./base"

/** Single market aggregated token price entry. */
export interface AggregatedTokenPriceCache extends SnapshotCacheResult {
    price: number
}

/** Aggregated token price cache result (prices by market listing). */
export interface AggregatedTokenPriceCacheResult extends SnapshotCacheResult {
    prices: Partial<Record<MarketListingId, AggregatedTokenPriceCache>>
}

/** Aggregated token price array cache result (prices by market listing). */
export interface AggregatedTokenPriceArrayCacheResult extends SnapshotCacheResult {
    array: Array<AggregatedTokenPriceCacheResult>
}