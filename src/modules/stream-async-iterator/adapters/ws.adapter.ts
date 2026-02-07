import {
    StreamConnection 
} from "../types"
import WebSocket, {
    MessageEvent 
} from "ws"

/**
 * WebSocketStreamConnection
 *
 * An adapter that wraps a WebSocket (`ws`) instance
 * and exposes it through the StreamConnection<T> interface.
 *
 * Purpose:
 * - Decouple WebSocket implementation from business logic
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
 * (e.g. async iterator, stream controller).
 */
export class WebSocketStreamConnection implements StreamConnection<MessageEvent>
{
    /**
     * Internal WebSocket instance.
     *
     * Kept private to ensure all interaction goes
     * through the StreamConnection abstraction.
     */
    ws: WebSocket

    /**
     * Creates a new WebSocket connection.
     *
     * @param ws - WebSocket instance or URL string to create connection
     *
     * @example
     * const connection = new WebSocketStreamConnection('ws://localhost:8080')
     * // or
     * const connection = new WebSocketStreamConnection(existingWebSocket)
     */
    constructor(ws: WebSocket | string) {
        // create new WebSocket if URL string provided
        if (typeof ws === "string") {
            this.ws = new WebSocket(ws)
        } else {
            // use provided WebSocket instance
            this.ws = ws
        }
    }

    /**
     * Registers a handler that is called when
     * the WebSocket connection is successfully opened.
     *
     * @param handler - Callback executed on "open" event
     *
     * @example
     * connection.onOpen(() => {
     *   console.log('WebSocket connected')
     * })
     */
    async onOpen(handler: () => void): Promise<void> {
        // register open event handler
        this.ws.on("open",
            handler)
    }

    /**
     * Registers a handler for incoming messages.
     *
     * Each "message" event corresponds to a single
     * message/frame received from the server.
     *
     * @param handler - Callback to process incoming data
     *
     * @example
     * connection.onData((event) => {
     *   console.log('Received message:', event.data)
     * })
     */
    onData(handler: (data: MessageEvent) => void): void {
        // register message event handler
        this.ws.on("message",
            handler)
    }

    /**
     * Registers a handler for WebSocket errors.
     *
     * This may include:
     * - network errors
     * - protocol errors
     * - internal WebSocket errors
     *
     * @param handler - Callback to handle errors
     *
     * @example
     * connection.onError((error) => {
     *   console.error('WebSocket error:', error)
     * })
     */
    onError(handler: (error: Error) => void): void {
        // register error event handler
        this.ws.on("error",
            handler)
    }

    /**
     * Registers a handler that is called when
     * the WebSocket connection is closed.
     *
     * This is triggered when:
     * - the server closes the connection
     * - the client explicitly calls close()
     *
     * @param handler - Callback executed on "close" event
     *
     * @example
     * connection.onClose(() => {
     *   console.log('WebSocket closed')
     * })
     */
    onClose(handler: () => void): void {
        // register close event handler
        this.ws.on("close",
            handler)
    }

    /**
     * Closes the WebSocket connection safely.
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
            this.ws.readyState === WebSocket.OPEN ||
            this.ws.readyState === WebSocket.CONNECTING
        ) {
            this.ws.close()
        }
    }
}