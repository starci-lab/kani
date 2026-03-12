/**
 * Service for producing messages to NATS subjects.
 *
 * @example
 * const producer = await app.get(NatsProducerService)
 * producer.publish({ subject: 'my.subject', payload: data })
 */
import type {
    NatsConnection 
} from "nats"
import {
    Injectable,
    OnModuleInit,
    OnApplicationShutdown,
} from "@nestjs/common"
import {
    Interval 
} from "@nestjs/schedule"
import {
    envConfig 
} from "@modules/env"
import {
    EventName 
} from "../enums"
import {
    NatsMessageFactoryService 
} from "./nats-message-factory.service"
import {
    InjectNats 
} from "./nats.decorators"
import type {
    NatsPublishParams 
} from "./types"

@Injectable()
export class NatsProducerService implements OnModuleInit, OnApplicationShutdown {
    constructor(
        @InjectNats()
        private readonly nc: NatsConnection,
        private readonly natsMessageFactoryService: NatsMessageFactoryService,
    ) {}

    async onModuleInit(): Promise<void> {
        // connection ready from provider; no extra init
    }

    /**
     * Publishes a string payload to the given NATS subject.
     *
     * @param params - Subject and payload
     *
     * @example
     * producer.publish({ subject: 'events.orders', payload: JSON.stringify(data) })
     */
    publish({ subject, payload }: NatsPublishParams): void {
        this.nc.publish(subject,
            new TextEncoder().encode(payload))
    }

    @Interval(envConfig().nats.ping.interval)
    async pingNats(): Promise<void> {
        this.publish({
            subject: EventName.Ping,
            payload: this.natsMessageFactoryService.create({
                message: {
                    status: "ok" 
                },
                withoutHash: true,
            }),
        })
    }

    async onApplicationShutdown(): Promise<void> {
        // connection closed by NatsConsumerService
    }
}
