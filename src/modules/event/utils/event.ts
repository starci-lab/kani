import {
    EventName 
} from "../enums"

/**
     * Get the event name.
     */
export const getEventName = <T extends EventName>(
    event: T,
    args?: Array<unknown>
): T => {
    if (args) {
        return `${event}.${args.map(arg => typeof arg === "string" ? arg : JSON.stringify(arg)).join(".")}` as T
    }
    return event as T
}
    