import type {
    CexId,
} from "@modules/databases"
import type {
    SnapshotCacheResult,
} from "./base"

/** Cex volume cache result (volumes by market listing). */
export interface CexTokenVolumeCacheResult extends SnapshotCacheResult {
    /** Token display ID. */
    tokenId: string
    /** Cex ID. */
    cexId: CexId
}