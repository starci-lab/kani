import {
    MarketListingId
} from "@modules/databases"
import {
    Dayjs
} from "dayjs"

export interface SnapshotCacheResult {
    snapshotAt: Dayjs
}

export interface AggregatedTokenPriceCache extends SnapshotCacheResult {
    price: number
}

export interface AggregatedTokenPriceCacheResult extends SnapshotCacheResult {
    prices: Partial<Record<MarketListingId, AggregatedTokenPriceCache>>
}