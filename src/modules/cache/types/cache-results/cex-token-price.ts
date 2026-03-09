import type {
    SnapshotCacheResult,
} from "./base"

/** Cex token price cache result. CexId is in cache args, not in result. */
export interface CexTokenPriceCacheResult extends SnapshotCacheResult {
    /** Token ID. */
    tokenId: string
}