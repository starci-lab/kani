import {
    EventName,
} from "@modules/event"
import type {
    ExecutorSchema,
} from "@modules/databases"

/**
 * Runtime listener for a single executor request lifecycle.
 */
export interface RuntimeListener {
    event: EventName
    args: Array<string>
    listener: (payload: unknown) => void | Promise<void>
}

/**
 * Runtime state for a single executor request lifecycle.
 */
export interface RuntimeState {
    initialized: boolean
    disposing: boolean
    listeners: Array<RuntimeListener>
    /** Cached executor; refreshed from DB or CoordinatorExecutorUpdated event. */
    executor: ExecutorSchema | null
}
