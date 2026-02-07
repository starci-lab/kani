/**
 * Kafka Producer Service
 * 
 * Independent service for producing messages to Kafka topics.
 * Waits for KafkaAdminService to be ready before initializing.
 */
import {
    Injectable, OnModuleInit, OnApplicationShutdown
} from "@nestjs/common"
import {
    Kafka, Producer
} from "kafkajs"
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

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnApplicationShutdown {
    public producer: Producer
    constructor(
        @InjectKafka()
        private readonly kafka: Kafka,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly winstonService: WinstonService,
    ) { }

    async onModuleInit(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(KafkaAdminService.name)
        this.producer = this.kafka.producer(
            {
                allowAutoTopicCreation: true,
                idempotent: false,
                maxInFlightRequests: envConfig().kafka.maxInFlightRequests,
                retry: {
                    retries: envConfig().kafka.producer.retry.retries,
                    restartOnFailure: () => Promise.resolve(envConfig().kafka.producer.retry.restartOnFailure),
                    factor: envConfig().kafka.producer.retry.factor,
                },
            }
        )
        await this.producer.connect()
        this.winstonService.log(WinstonLog.KafkaProducerReady,
            {
            })
    }

    async onApplicationShutdown(): Promise<void> {
        await this.producer.disconnect()
    }
}
