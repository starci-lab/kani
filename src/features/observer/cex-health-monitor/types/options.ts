import type { CexId } from "@modules/databases"

/** Options for CEX health monitor module. */
export interface CexHealthMonitorOptions {
    /** CEX IDs to track, in priority order (first healthy wins). */
    trackedCexIds: Array<CexId>
    /** Seconds without update to consider CEX stale; default 10. */
    staleThresholdSeconds?: number
}
