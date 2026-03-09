import type {
    SnapshotCacheResult,
} from "./base"

/** Cex token volume cache result. CexId is in cache args, not in result. */
export interface CexTokenVolumeCacheResult extends SnapshotCacheResult {
    /** Token ID. */
    tokenId: string
}