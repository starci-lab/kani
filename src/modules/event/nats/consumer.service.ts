/**
 * Service for consuming messages from NATS subjects.
 *
 * @example
 * const consumer = await app.get(NatsConsumerService)
 * await consumer.subscribe({ subjects: ['my.subject'], callback: (subject, data) => { ... } })
 */
import type {
    NatsConnection, Subscription 
} from "nats"
import {
    Inject,
    Injectable,
    OnModuleInit,
    OnApplicationShutdown,
} from "@nestjs/common"
import {
    InjectNats 
} from "./nats.decorators"
import {
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} from "./nats.module-definition"
import type {
    NatsSubscribeParams,
    NatsSubscribeResult,
} from "./types"

@Injectable()
export class NatsConsumerService implements OnModuleInit, OnApplicationShutdown {
    private subscriptions: Array<Subscription> = []

    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectNats()
        private readonly nc: NatsConnection,
    ) {}

    async onModuleInit(): Promise<void> {
        // connection is ready from provider; no extra init
    }

    /**
     * Subscribes to the given subjects and invokes the callback for each message.
     *
     * @param params - Subjects and callback
     * @returns List of subscriptions (for drain on shutdown)
     *
     * @example
     * const subs = await consumer.subscribe({
     *   subjects: ['events.>'],
     *   callback: async (subject, data) => { ... },
     * })
     */
    async subscribe({
        subjects,
        callback,
    }: NatsSubscribeParams): Promise<NatsSubscribeResult> {
        const { queueGroup } = this.options
        const subs: Array<Subscription> = []

        for (const subject of subjects) {
            const sub = queueGroup
                ? this.nc.subscribe(subject,
                    {
                        queue: queueGroup 
                    })
                : this.nc.subscribe(subject)
            subs.push(sub)
            this.subscriptions.push(sub)

            // run message loop for this subscription (fire-and-forget)
            void (async () => {
                for await (const msg of sub) {
                    try {
                        await callback(msg.subject,
                            msg.data)
                    } catch {
                        // ignore callback error to avoid breaking the loop
                    }
                }
            })()
        }

        return subs
    }

    async onApplicationShutdown(): Promise<void> {
        for (const sub of this.subscriptions) {
            await sub.drain()
        }
        await this.nc.close()
    }
}
