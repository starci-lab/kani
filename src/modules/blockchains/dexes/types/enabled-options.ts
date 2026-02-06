import {
    DexActionOptions
} from "./action-options"

/**
 * Configuration options for enabling/disabling DEX features.
 * Controls which features are active for a DEX.
 */
export interface DexEnabledOptions {
    /** Whether to enable observation features. */
    observe?: boolean
    /** Action configuration - can be a boolean or detailed action options. */
    action?: boolean | DexActionOptions
    /** Whether to enable analytics features. */
    analytics?: boolean
    /** Whether to include reserves with fees. */
    reservesWithFees?: boolean
}
