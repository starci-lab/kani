import { Injectable } from "@nestjs/common"
import pDefer, { DeferredPromise } from "p-defer"
import crypto from "crypto"

export type WatcherState = "pending" | "ready" | "error"

export interface ReadinessWatcher {
  name: string
  deferred: DeferredPromise<void>
  state: WatcherState
}

@Injectable()
export class ReadinessWatcherFactoryService {
    readonly watchers: Record<string, ReadinessWatcher> = {}

    createWatcher(name: string): ReadinessWatcher {
        if (this.watchers[name]) {
            throw new Error(`Watcher '${name}' already exists`)
        }
        const deferred = pDefer<void>()
        const watcher: ReadinessWatcher = { name, deferred, state: "pending" }
        this.watchers[name] = watcher
        return watcher
    }

    waitUntilReady(name: string): Promise<void> {
        const watcher = this.watchers[name]
        if (!watcher) throw new Error(`Watcher '${name}' not found`)
        return watcher.deferred.promise
    }

    setReady(name: string): void {
        const watcher = this.watchers[name]
        if (!watcher) throw new Error(`Watcher '${name}' not found`)
        watcher.state = "ready"
        watcher.deferred.resolve()
    }

    setErrored(name: string, error: Error): void {
        const watcher = this.watchers[name]
        if (!watcher) throw new Error(`Watcher '${name}' not found`)
        watcher.state = "error"
        watcher.deferred.reject(error)
    }

    getStatus(): Record<string, WatcherState> {
        return Object.fromEntries(
            Object.entries(this.watchers).map(([name, watcher]) => [name, watcher.state]),
        )
    }
}

export const createReadinessWatcherName = (name: string, params: Record<string, string>) => {
    return crypto.createHash("sha256").update(JSON.stringify({ name, params })).digest("hex")
}