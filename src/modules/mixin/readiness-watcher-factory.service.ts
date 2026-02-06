import {
    Injectable
} from "@nestjs/common"
import pDefer from "p-defer"
import type {
    ReadinessWatcher,
    WatcherState
} from "./types"

/**
 * Service for creating and managing readiness watchers.
 */
@Injectable()
export class ReadinessWatcherFactoryService {
    readonly watchers: Map<string, ReadinessWatcher> = new Map()

    /**
     * Create a new readiness watcher.
     * @param name - The name of the watcher.
     * @returns The readiness watcher.
     */
    createWatcher(name: string): ReadinessWatcher {
        if (this.watchers.has(name)) {
            throw new Error(`Watcher '${name}' already exists`)
        }
        const deferred = pDefer<void>()
        const watcher: ReadinessWatcher = {
            name,
            deferred,
            state: "pending",
        }
        this.watchers.set(name,
            watcher)
        return watcher
    }

    /**
     * Wait until the watcher is ready.
     * @param name - The name of the watcher.
     * @returns A promise that resolves when the watcher is ready.
     */
    waitUntilReady(name: string): Promise<void> {
        const watcher = this.watchers.get(name)
        if (!watcher) throw new Error(`Watcher '${name}' not found`)
        return watcher.deferred.promise
    }

    /**
     * Set the watcher to ready.
     * @param name - The name of the watcher.
     */
    setReady(name: string): void {
        const watcher = this.watchers.get(name)
        if (!watcher) throw new Error(`Watcher '${name}' not found`)
        watcher.state = "ready"
        watcher.deferred.resolve()
    }

    /**
     * Set the watcher to errored.
     * @param name - The name of the watcher.
     * @param error - The error to set the watcher to.
     */
    setErrored(name: string, error: Error): void {
        const watcher = this.watchers.get(name)
        if (!watcher) throw new Error(`Watcher '${name}' not found`)
        watcher.state = "error"
        watcher.deferred.reject(error)
    }

    /**
     * Get the status of all watchers.
     * @returns A record of the status of all watchers.
     */
    getStatus(): Record<string, WatcherState> {
        return Object.fromEntries(
            Array.from(this.watchers.entries()).map(([name,
                watcher]) => [
                name,
                watcher.state,
            ]),
        )
    }
}
