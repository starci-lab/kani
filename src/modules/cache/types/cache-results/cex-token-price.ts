import type {
    CexId,
} from "@modules/databases"
import type {
    SnapshotCacheResult,
} from "./base"

/** Cex token cache result (tokens by market listing). */
export interface CexTokenPriceCacheResult extends SnapshotCacheResult {
    /** Token display ID. */
    tokenId: string
    /** Cex ID. */
    cexId: CexId
}