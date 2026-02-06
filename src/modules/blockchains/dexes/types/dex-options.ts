import {
    DexEnabledOptions
} from "./enabled-options"

/**
 * Configuration options for a single DEX.
 * Controls which features are enabled for the DEX.
 */
export interface DexOptions {
    /** Feature enablement configuration. */
    enabled?: DexEnabledOptions
}
