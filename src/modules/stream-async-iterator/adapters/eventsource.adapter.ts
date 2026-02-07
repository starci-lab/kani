import {
    StreamConnection 
} from "../types"
import {
    EventSource 
} from "eventsource"
/**
 * EventSourceStreamConnection
 *
 * An adapter that wraps an `EventSource` (SSE) instance
 * and exposes it through the `StreamConnection<T>` interface.
 *
 * Purpose:
 * - Decouple EventSource/SSE implementation from business logic
 * - Allow the same stream abstraction to be reused for:
 *   - WebSocket
 *   - Server-Sent Events (SSE)
 *   - gRPC streaming
 *   - Mock connections for testing
 *
 * This class is intentionally low-level.
 * It does NOT handle:
 * - buffering
 * - backpressure
 * - reconnection logic
 *
 * Those concerns should be implemented at a higher layer
 * (e.g. async iterator, retry controller).
 */
export class EventSourceStreamConnection implements StreamConnection<MessageEvent>
{
    /**
     * Internal EventSource instance.
     *
     * Kept as a field so higher layers can still access raw connection
     * when needed (e.g. for debugging/metrics).
     */
    eventSource: EventSource

    /**
     * Creates a new EventSource (SSE) connection.
     *
     * @param eventSource - either an existing EventSource instance or an SSE URL
     *
     * @example
     * const connection = new EventSourceStreamConnection('http://localhost:8080/events')
     * // or
     * const connection = new EventSourceStreamConnection(existingEventSource)
     */
    constructor(eventSource: EventSource | string) {
        // create new EventSource if URL string provided
        if (typeof eventSource === "string") {
            this.eventSource = new EventSource(eventSource)
        } else {
            // use provided EventSource instance
            this.eventSource = eventSource
        }
    }

    /**
     * Registers a handler that is called when
     * the SSE connection is successfully opened.
     *
     * @param handler - Callback executed on "open" event
     *
     * @example
     * connection.onOpen(() => {
     *   console.log('SSE connection opened')
     * })
     */
    async onOpen(handler: () => void): Promise<void> {
        // register open event listener
        this.eventSource.addEventListener("open",
            handler)
    }

    /**
     * Registers a handler for incoming messages.
     *
     * Each "message" event corresponds to a single
     * message/frame received from the server.
     *
     * @param handler - Callback to process incoming SSE message
     *
     * @example
     * connection.onData((event) => {
     *   console.log('Received SSE message:', event.data)
     * })
     */
    onData(handler: (data: MessageEvent) => void): void {
        // register message event listener
        this.eventSource.addEventListener("message",
            handler)
    }

    /**
     * Registers a handler for EventSource errors.
     *
     * This may include:
     * - network errors
     * - protocol errors
     * - internal EventSource errors
     *
     * @param handler - Callback to handle errors
     *
     * @example
     * connection.onError((error) => {
     *   console.error('SSE error:', error)
     * })
     */
    onError(
        handler: (error: Error) => void): void {
        // register error event listener and convert ErrorEvent to Error
        this.eventSource.addEventListener("error",
            (error: ErrorEvent) => {
                handler(new Error(error.message))
            })
    }

    /**
     * Registers a handler that is called when
     * the SSE connection is closed.
     *
     * This is triggered when:
     * - the server closes the connection
     * - the client explicitly calls close()
     *
     * @param handler - Callback executed on "close" event
     *
     * @example
     * connection.onClose(() => {
     *   console.log('SSE connection closed')
     * })
     */
    onClose(handler: () => void): void {
        // register close event listener
        this.eventSource.addEventListener("close",
            handler)
    }

    /**
     * Closes the EventSource connection safely.
     *
     * - Ensures close() is only called in valid states
     * - Prevents redundant close calls
     * - Safe to invoke from cleanup logic (e.g. finally blocks)
     *
     * @example
     * connection.close()
     */
    async close(): Promise<void> {
        // only close if connection is open or connecting
        if (
            this.eventSource.readyState === EventSource.OPEN ||
            this.eventSource.readyState === EventSource.CONNECTING
        ) {
            this.eventSource.close()
        }
    }
}