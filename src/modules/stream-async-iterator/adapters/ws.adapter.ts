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
     * @param url - WebSocket endpoint URL
     */
    constructor(ws: WebSocket | string) {
        if (typeof ws === "string") {
            this.ws = new WebSocket(ws)
        } else {
            this.ws = ws
        }
    }

    /**
     * Registers a handler that is called when
     * the WebSocket connection is successfully opened.
     *
     * @param handler - Callback executed on "open" event
     */
    onOpen(handler: () => void): void {
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
     */
    onData(handler: (data: MessageEvent) => void): void {
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
     */
    onError(handler: (error: Error) => void): void {
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
     */
    onClose(handler: () => void): void {
        this.ws.on("close",
            handler)
    }

    /**
     * Closes the WebSocket connection safely.
     *
     * - Ensures close() is only called in valid states
     * - Prevents redundant close calls
     * - Safe to invoke from cleanup logic (e.g. finally blocks)
     */
    close(): void {
        if (
            this.ws.readyState === WebSocket.OPEN ||
            this.ws.readyState === WebSocket.CONNECTING
        ) {
            this.ws.close()
        }
    }
}