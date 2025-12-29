/**
 * Kafka Consumer Service
 * 
 * Independent service for consuming messages from Kafka topics.
 * Waits for KafkaAdminService to be ready before initializing.
 */
import { Injectable, OnModuleInit, OnApplicationShutdown } from "@nestjs/common"
import { Consumer, Kafka } from "kafkajs"
import { InstanceIdService, ReadinessWatcherFactoryService } from "@modules/mixin"
import { InjectKafka } from "./kafka.decorators"
import { KafkaAdminService } from "./admin.service"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { WinstonLog } from "@modules/winston"
import { sleep } from "@utils"
import { envConfig } from "@modules/env"

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnApplicationShutdown {
    public consumer: Consumer 
    constructor(
        @InjectKafka()
        private readonly kafka: Kafka,
        private readonly instanceIdService: InstanceIdService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}
    
    async onModuleInit(): Promise<void> {
        this.readinessWatcherFactoryService.createWatcher(KafkaConsumerService.name)
        await this.readinessWatcherFactoryService.waitUntilReady(KafkaAdminService.name)
        this.consumer = this.kafka.consumer(
            { 
                groupId: this.instanceIdService.getId(),
                allowAutoTopicCreation: false,
                heartbeatInterval: envConfig().kafka.heartbeatInterval,
                retry: {
                    retries: envConfig().kafka.retry.retries,
                    restartOnFailure: () => Promise.resolve(envConfig().kafka.retry.restartOnFailure),
                    factor: envConfig().kafka.retry.factor,    
                },
                readUncommitted: true,
            })
        // wait for metadata stabilization delay
        await sleep(envConfig().kafka.metadataStabilizationDelayMs)
        await this.consumer.connect()
        this.logger.debug(WinstonLog.KafkaConsumerReady)
        this.readinessWatcherFactoryService.setReady(KafkaConsumerService.name)
    }

    async onApplicationShutdown(): Promise<void> {
        await this.consumer.disconnect()
    }
}

