/**
 * Options for the CEX module.
 */
export interface CexesModuleOptions {
    /**
     * Whether to use local storage.
     */
    useLocal?: boolean
    /**
     * Whether to use NATS (event streaming).
     */
    useNats?: boolean
}