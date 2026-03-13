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
} from "@nestjs/common"
import {
    NatsMessageFactoryService 
} from "./nats-message-factory.service"
import {
    InjectNats 
} from "./nats.decorators"
import type {
    NatsPublishParams 
} from "./types"
import {
    envConfig 
} from "@modules/env"
import {
    Interval 
} from "@nestjs/schedule"
import {
    EventName 
} from "../enums"

@Injectable()
export class NatsProducerService {
    constructor(
        @InjectNats()
        private readonly nc: NatsConnection,
        private readonly natsMessageFactoryService: NatsMessageFactoryService,
    ) {}

    /**
     * Publishes a string payload to the given NATS subject.
     *
     * @param params - Subject and payload
     *
     * @example
     * producer.publish({ subject: 'events.orders', payload: JSON.stringify(data) })
     */
    publish({ subject, payload }: NatsPublishParams): void {
        this.nc.publish(
            subject,
            new TextEncoder().encode(payload)
        )
    }

   /**
     * Pings the Kafka producer.
     *
     * @returns Promise that resolves when producer is pinged
     */
   @Interval(envConfig().nats.ping.interval)
    async pingNats(): Promise<void> {
        this.publish({
            subject: EventName.Ping,
            payload: this.natsMessageFactoryService.create(
                {
                    message: {
                        status: "ok"
                    },
                    withoutHash: true
                }
            )
        })
    }

}
