/**
 * Service for producing messages to Kafka topics.
 *
 * Independent service that waits for KafkaAdminService to be ready before initializing.
 *
 * @example
 * const producer = await app.get(KafkaProducerService)
 * await producer.producer.send({ topic: 'my-topic', messages: [...] })
 */
import type {
    Kafka, Producer
} from "kafkajs"
import {
    Injectable, OnModuleInit, OnApplicationShutdown
} from "@nestjs/common"
import {
    ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    InjectKafka
} from "./kafka.decorators"
import {
    KafkaAdminService
} from "./admin.service"
import {
    WinstonService
} from "@modules/winston"
import {
    WinstonLog
} from "@modules/winston"
import {
    envConfig
} from "@modules/env"
import {
    Interval 
} from "@nestjs/schedule"
import {
    EventName 
} from "../enums"
import {
    KafkaMessageFactoryService 
} from "./kafka-message-factory.service"

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnApplicationShutdown {
    public producer: Producer
    constructor(
        @InjectKafka()
        private readonly kafka: Kafka,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly winstonService: WinstonService,
        private readonly kafkaMessageFactoryService: KafkaMessageFactoryService,
    ) { }

    /**
     * Initializes the Kafka producer.
     *
     * Waits for admin service to be ready, then creates and connects the producer.
     *
     * @returns Promise that resolves when producer is ready
     */
    async onModuleInit(): Promise<void> {
        // wait for admin service to be ready
        await this.readinessWatcherFactoryService.waitUntilReady(KafkaAdminService.name)
        // create producer with configuration
        this.producer = this.kafka.producer(
            {
                allowAutoTopicCreation: true,
                idempotent: false,
                maxInFlightRequests: envConfig().kafka.maxInFlightRequests,
                retry: {
                    retries: envConfig().kafka.producer.retry.retries,
                    restartOnFailure: () => Promise.resolve(envConfig().kafka.producer.retry.restartOnFailure),
                    factor: envConfig().kafka.producer.retry.factor,
                    maxRetryTime: envConfig().kafka.producer.retry.maxTimeout,
                },
            }
        )
        // connect producer to Kafka
        await this.producer.connect()
        // log producer ready
        this.winstonService.log(WinstonLog.KafkaProducerReady,
            {
            }
        )
    }

    /**
     * Pings the Kafka producer.
     *
     * @returns Promise that resolves when producer is pinged
     */
    @Interval(envConfig().kafka.ping.interval)
    async pingKafka(): Promise<void> {
        await this.producer.send({
            topic: EventName.Ping,
            messages: [
                {
                    value: this.kafkaMessageFactoryService.create(
                        {
                            status: "ok"
                        },
                        true
                    )
                }
            ],
        })
    }

    /**
     * Disconnects the Kafka producer on application shutdown.
     *
     * @returns Promise that resolves when producer is disconnected
     */

    async onApplicationShutdown(): Promise<void> {
        await this.producer.disconnect()
    }
}
