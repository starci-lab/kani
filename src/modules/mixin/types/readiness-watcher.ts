import type {
    DeferredPromise
} from "p-defer"

/** State of a readiness watcher. */
export type WatcherState = "pending" | "ready" | "error"

/** A named deferred promise for readiness. */
export interface ReadinessWatcher {
    name: string
    deferred: DeferredPromise<void>
    state: WatcherState
}

/** Params for building a readiness watcher name (hashed). */
export interface GetReadinessWatcherNameParams {
    name: string
    params: Record<string, string>
}
