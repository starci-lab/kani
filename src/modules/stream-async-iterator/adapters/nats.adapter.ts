import type {
    NatsConnection, Msg, Subscription 
} from "nats"
import {
    StreamConnection 
} from "../types"

export interface NatsStreamConnectionOptions {
    /**
     * NATS connection (must already be connected).
     */
    nc: NatsConnection
    /**
     * Subjects to subscribe to.
     */
    subjects: Array<string>
    /**
     * Optional queue group for load-balanced consumption.
     */
    queueGroup?: string
}

/**
 * NatsStreamConnection
 *
 * Adapter that wraps a NATS connection and exposes subscriptions
 * through the StreamConnection<Msg> interface.
 *
 * This class is intentionally low-level.
 * It does NOT handle:
 * - buffering
 * - backpressure
 * - reconnection
 *
 * The connection (nc) is not closed on close(); only subscriptions are drained.
 */
export class NatsStreamConnection implements StreamConnection<Msg> {
    private readonly nc: NatsConnection
    private readonly subjects: Array<string>
    private readonly queueGroup?: string
    private subscriptions: Array<Subscription> = []

    constructor(options: NatsStreamConnectionOptions) {
        this.nc = options.nc
        this.subjects = options.subjects
        this.queueGroup = options.queueGroup
    }

    /**
     * Subscribes to subjects, calls open handler, then starts message loop.
     */
    async onOpen(handler: () => void | Promise<void>): Promise<void> {
        for (const subject of this.subjects) {
            const sub = this.queueGroup
                ? this.nc.subscribe(subject,
                    {
                        queue: this.queueGroup 
                    })
                : this.nc.subscribe(subject)
            this.subscriptions.push(sub)
        }

        await handler()

        const iterateAll = async (): Promise<void> => {
            const subs = [...this.subscriptions]
            const pending = subs.map(
                async (sub) => {
                    for await (const msg of sub) {
                        if (this.onDataHandler) {
                            try {
                                this.onDataHandler(msg)
                            } catch (error) {
                                if (this.onErrorHandler) {
                                    this.onErrorHandler(
                                        error instanceof Error ? error : new Error(String(error)),
                                    )
                                }
                            }
                        }
                    }
                }
            )
            await Promise.all(pending)
        }
        void iterateAll()
    }

    private onDataHandler: ((data: Msg) => void | Promise<void>) | null = null

    onData(handler: (data: Msg) => void | Promise<void>): void {
        this.onDataHandler = handler
    }

    private onErrorHandler: ((error: Error) => void) | null = null

    onError(handler: (error: Error) => void): void {
        this.onErrorHandler = handler
    }

    private onCloseHandler: (() => void) | null = null

    onClose(handler: () => void): void {
        this.onCloseHandler = handler
    }

    /**
     * Drains all subscriptions. Does not close the NATS connection.
     */
    async close(): Promise<void> {
        for (const sub of this.subscriptions) {
            await sub.drain()
        }
        this.subscriptions = []
        if (this.onCloseHandler) {
            this.onCloseHandler()
        }
    }
}
