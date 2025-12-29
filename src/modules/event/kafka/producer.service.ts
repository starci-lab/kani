/**
 * Kafka Producer Service
 * 
 * Independent service for producing messages to Kafka topics.
 * Waits for KafkaAdminService to be ready before initializing.
 */
import { Injectable, OnModuleInit, OnApplicationShutdown } from "@nestjs/common"
import { Kafka, Producer } from "kafkajs"
import { ReadinessWatcherFactoryService } from "@modules/mixin"
import { InjectKafka } from "./kafka.decorators"
import { KafkaAdminService } from "./admin.service"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { WinstonLog } from "@modules/winston"
import { sleep } from "@utils"
import { envConfig } from "@modules/env"

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnApplicationShutdown {
    public producer: Producer 
    constructor(
        @InjectKafka()
        private readonly kafka: Kafka,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}
    
    async onModuleInit(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(KafkaAdminService.name)
        this.producer = this.kafka.producer(
            { 
                allowAutoTopicCreation: false,
                idempotent: true,
                maxInFlightRequests: envConfig().kafka.maxInFlightRequests,
                retry: { 
                    retries: envConfig().kafka.retry.retries,
                    restartOnFailure: () => Promise.resolve(envConfig().kafka.retry.restartOnFailure),
                    factor: envConfig().kafka.retry.factor,    
                },
            }
        )
        // wait for metadata stabilization delay
        await sleep(envConfig().kafka.metadataStabilizationDelayMs)
        await this.producer.connect()
        this.logger.debug(WinstonLog.KafkaProducerReady)
    }

    async onApplicationShutdown(): Promise<void> {
        await this.producer.disconnect()
    }
}
