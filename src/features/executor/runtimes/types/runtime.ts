import { 
    EventName 
} from "@modules/event"

/**
 * Runtime listener for a single bot request lifecycle.
 */
export interface RuntimeListener {
    event: EventName
    args: Array<string>
    listener: (payload: unknown) => void | Promise<void>
}

/**
 * Runtime state for a single bot request lifecycle.
 */
export interface RuntimeState {
    initialized: boolean
    disposing: boolean
    intervals: Array<NodeJS.Timeout>
    listeners: Array<RuntimeListener>
}