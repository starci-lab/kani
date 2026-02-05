/**
 * Kafka Consumer Service
 * 
 * Independent service for consuming messages from Kafka topics.
 * Waits for KafkaAdminService to be ready before initializing.
 */
import {
    Injectable, OnModuleInit, OnApplicationShutdown 
} from "@nestjs/common"
import {
    Consumer, Kafka 
} from "kafkajs"
import {
    ReadinessWatcherFactoryService, RetryService 
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
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./kafka.module-definition"
import {
    Inject 
} from "@nestjs/common"

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnApplicationShutdown {
    public consumer: Consumer 
    constructor(
        @InjectKafka()
        private readonly kafka: Kafka,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly winstonService: WinstonService,
        private readonly retryService: RetryService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) {}
    
    async onModuleInit(): Promise<void> {
        await this.retryService.retry(
            {
                options: {
                    maxRetryTime: Infinity,
                },
                action: async () => {
                    this.readinessWatcherFactoryService.createWatcher(KafkaConsumerService.name)
                    await this.readinessWatcherFactoryService.waitUntilReady(KafkaAdminService.name)
                    this.consumer = this.kafka.consumer(
                        { 
                            groupId: this.options?.clientId,
                            allowAutoTopicCreation: true,
                            heartbeatInterval: envConfig().kafka.heartbeatInterval,
                            retry: {
                                retries: envConfig().kafka.retry.retries,
                                restartOnFailure: () => Promise.resolve(envConfig().kafka.retry.restartOnFailure),
                                factor: envConfig().kafka.retry.factor,    
                            },
                            readUncommitted: true,
                        })
                    await this.consumer.connect()
                    this.winstonService.log(WinstonLog.KafkaConsumerReady,
                        {
                        })
                    this.readinessWatcherFactoryService.setReady(KafkaConsumerService.name)
                }
            }
        )
    }

    async onApplicationShutdown(): Promise<void> {
        await this.consumer.disconnect()
    }
}

