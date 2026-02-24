/**
 * Services in Consul DNS.
 */
export enum ServiceName {
    KaniExecutor = "kani-executor",
    KaniObserver = "kani-observer",
    KaniCoordinator = "kani-coordinator",
    KaniCLI = "kani-cli",
    KaniInterface = "kani-interface",
    KaniInspector = "kani-inspector",
    // unknown for fallback service name
    KaniUnknown = "kani-unknown",
}