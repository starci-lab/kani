/**
 * Configuration options for DEX action functionality.
 * Controls whether actions should be enqueued and/or executed.
 */
export interface DexActionOptions {
    /** Whether to enqueue actions. */
    enqueue?: boolean
    /** Whether to execute actions. */
    action?: boolean
}
