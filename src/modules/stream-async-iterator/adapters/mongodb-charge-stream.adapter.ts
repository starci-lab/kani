import {
    StreamConnection 
} from "../types"
import {
    ChangeStream, ChangeStreamDeleteDocument, ChangeStreamInsertDocument, ChangeStreamOptions, ChangeStreamReplaceDocument, ChangeStreamUpdateDocument 
} from "mongodb"
import {
    AbstractSchema 
} from "@modules/databases/mongodb/primary/schemas"
import {
    Model 
} from "mongoose"

type ChangeDoc<TSchema extends AbstractSchema> = ChangeStreamInsertDocument<TSchema> | ChangeStreamUpdateDocument<TSchema> | ChangeStreamDeleteDocument<TSchema> | ChangeStreamReplaceDocument<TSchema>
/**
 * MongoDBChangeStreamConnection
 *
 * An adapter that wraps a MongoDB ChangeStream instance
 * and exposes it through the StreamConnection<T> interface.
 *
 * Purpose:
 * - Decouple MongoDB ChangeStream implementation from business logic
 * - Allow the same stream abstraction to be reused for:
 *   - WebSocket
 *   - Server-Sent Events (SSE)
 *   - MongoDB ChangeStream
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
export class MongoDBChangeStreamConnection<TSchema extends AbstractSchema> implements StreamConnection<ChangeDoc<TSchema>>
{
    /**
     * Internal ChangeStream instance.
     *
     * Kept as a field so higher layers can still access raw connection
     * when needed (e.g. for debugging/metrics).
     */
    changeStream: ChangeStream<TSchema>

    /**
     * Flag to track if the stream has been opened.
     * MongoDB ChangeStream doesn't have an explicit "open" event,
     * so we consider it open after creation.
     */
    private opened = false

    /**
     * Stores the onOpen handler to call when stream is ready.
     */
    private onOpenHandler: (() => void) | null = null

    /**
     * Creates a new MongoDB ChangeStream connection.
     *
     * @param changeStream - either an existing ChangeStream instance or parameters to create one
     */
    constructor(
        changeStream: ChangeStream<TSchema> | {
            model: Model<TSchema>
            pipeline?: Array<Record<string, unknown>>
            options?: ChangeStreamOptions
        }
    ) {
        if ("model" in changeStream) {
            // Create ChangeStream from model
            this.changeStream = changeStream.model.watch(
                changeStream.pipeline ?? [],
                changeStream.options ?? {
                }
            ) as ChangeStream<TSchema>
        } else {
            // Use provided ChangeStream
            this.changeStream = changeStream
        }

        // Consider the stream open immediately after creation
        // MongoDB ChangeStream is ready when created
        this.opened = true
    }

    /**
     * Registers a handler that is called when
     * the ChangeStream connection is successfully opened.
     *
     * Note: MongoDB ChangeStream doesn't have an explicit "open" event,
     * so this is called immediately after stream creation.
     *
     * @param handler - Callback executed on "open" event
     */
    onOpen(handler: () => void): void {
        this.onOpenHandler = handler
        // If stream is already opened, call handler immediately
        if (this.opened) {
            handler()
        }
    }
    /**
     * Registers a handler for incoming change events.
     *
     * Each "change" event corresponds to a single
     * document change in the MongoDB collection.
     *
     * @param handler - Callback to process incoming change data
     */
    onData(handler: (data: ChangeDoc<TSchema>) => void | Promise<void>): void {
        this.changeStream.on("change",
            handler)
    }
    /**
     * Registers a handler for ChangeStream errors.
     *
     * This may include:
     * - network errors
     * - database connection errors
     * - internal ChangeStream errors
     *
     * @param handler - Callback to handle errors
     */
    onError(handler: (error: Error) => void): void {
        this.changeStream.on("error",
            (error: Error) => {
                handler(error)
            })
    }

    /**
     * Registers a handler that is called when
     * the ChangeStream connection is closed.
     *
     * This is triggered when:
     * - the stream is explicitly closed
     * - the database connection is lost
     * - the stream is invalidated
     *
     * @param handler - Callback executed on "close" event
     */
    onClose(handler: () => void): void {
        this.changeStream.on("close",
            handler)
    }

    /**
     * Closes the ChangeStream connection safely.
     *
     * - Ensures close() is only called in valid states
     * - Prevents redundant close calls
     * - Safe to invoke from cleanup logic (e.g. finally blocks)
     */
    close(): void {
        if (this.changeStream && !this.changeStream.closed) {
            this.changeStream.close()
        }
    }
}
