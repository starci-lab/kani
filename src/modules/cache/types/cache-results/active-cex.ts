import type {
    CexId 
} from "@modules/databases"

/** Cache result for active CEX per token (price or volume). Args: [tokenId, cexId]. Value: boolean. */
export interface ActiveCexCacheResult {
    /** Active CEX ID for this token. */
    cexId: CexId
}
