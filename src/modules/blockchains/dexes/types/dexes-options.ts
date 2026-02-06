import {
    DexId
} from "@modules/databases"
import {
    DexEnabledOptions
} from "./enabled-options"

/**
 * Configuration options for multiple DEXes.
 * Controls which DEXes are included and which features are enabled.
 */
export interface DexesOptions {
    /** Array of DEX IDs to include. */
    dexIds?: Array<DexId>
    /** Feature enablement configuration. */
    enabled?: DexEnabledOptions
}
