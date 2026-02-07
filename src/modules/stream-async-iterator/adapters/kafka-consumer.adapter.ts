import pRetry from "p-retry"
import {
    StreamConnection
} from "../types"
import type {
    Consumer,
    EachMessagePayload
} from "kafkajs"

/**
 * KafkaConsumerStreamConnection
 *
 * Adapter that wraps a Kafka Consumer and exposes it
 * through the StreamConnection<T> interface.
 *
 * This class is intentionally low-level.
 * It does NOT handle:
 * - buffering
 * - backpressure
 * - reconnection
 */
export class KafkaConsumerStreamConnection
implements StreamConnection<EachMessagePayload>
{
    /**
     * Internal Kafka consumer instance.
     */
    consumer: Consumer

    /**
     * Topics to subscribe to.
     */
    private topics: Array<string>

    constructor(
        consumer: Consumer,
        topics: Array<string>
    ) {
        this.consumer = consumer
        this.topics = topics
    }

    /**
     * Registers open handler and starts consumer.
     */
    async onOpen(handler: () => void | Promise<void>): Promise<void> {
        // connect to Kafka
        await this.consumer.connect()
        // subscribe to topics
        await this.consumer.subscribe({
            topics: this.topics,
            fromBeginning: false,
        })
        // call handler when consumer is opened
        await handler()
        // run the consumer
        await this.consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                if (this.onDataHandler) {
                    try {
                        await this.onDataHandler(payload)
                    } catch (error) {
                        if (this.onErrorHandler) {
                            this.onErrorHandler(
                                error instanceof Error
                                    ? error
                                    : new Error(String(error))
                            )
                        }
                    }
                }
            },
        })
    }

    private onDataHandler:
        | ((data: EachMessagePayload) => void | Promise<void>)
        | null = null

    onData(
        handler: (data: EachMessagePayload) => void | Promise<void>
    ): void {
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
     * Closes Kafka consumer safely.
     */
    async close(): Promise<void> {
        await pRetry(
            async () => {
                await this.consumer.stop()
                await this.consumer.disconnect()
                // call the onClose handler
                if (this.onCloseHandler) {
                    this.onCloseHandler()
                }
            }
        )
    }
}