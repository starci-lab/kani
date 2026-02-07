/**
 * Service for consuming messages from Kafka topics.
 *
 * Independent service that waits for KafkaAdminService to be ready before initializing.
 *
 * @example
 * const consumer = await app.get(KafkaConsumerService)
 * await consumer.consumer.subscribe({ topics: ['my-topic'] })
 */
import type {
    Consumer, Kafka 
} from "kafkajs"
import {
    Injectable, OnModuleInit, OnApplicationShutdown, Inject 
} from "@nestjs/common"
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
    envConfig 
} from "@modules/env"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./kafka.module-definition"

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnApplicationShutdown {
    public consumer: Consumer 
    constructor(
        @InjectKafka()
        private readonly kafka: Kafka,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly retryService: RetryService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) {}
    
    /**
     * Initializes the Kafka consumer.
     *
     * Waits for admin service to be ready, then creates and connects the consumer.
     *
     * @returns Promise that resolves when consumer is ready
     */
    async onModuleInit(): Promise<void> {
        await this.retryService.retry(
            {
                options: {
                    maxRetryTime: Infinity,
                },
                action: async () => {
                    // create readiness watcher for this service
                    this.readinessWatcherFactoryService.createWatcher(KafkaConsumerService.name)

                    // wait for admin service to be ready
                    await this.readinessWatcherFactoryService.waitUntilReady(KafkaAdminService.name)

                    // create consumer with configuration
                    this.consumer = this.kafka.consumer(
                        { 
                            groupId: this.options?.clientId,
                            allowAutoTopicCreation: true,
                            heartbeatInterval: envConfig().kafka.heartbeatInterval,
                            retry: {
                                retries: envConfig().kafka.consumer.retry.retries,
                                restartOnFailure: () => Promise.resolve(envConfig().kafka.consumer.retry.restartOnFailure),
                                factor: envConfig().kafka.consumer.retry.factor,    
                                maxRetryTime: envConfig().kafka.consumer.retry.maxTimeout,
                            },
                            readUncommitted: true,
                        })
                    // mark this service as ready
                    this.readinessWatcherFactoryService.setReady(KafkaConsumerService.name)
                }
            }
        )
    }

    /**
     * Disconnects the Kafka consumer on application shutdown.
     *
     * @returns Promise that resolves when consumer is disconnected
     */

    async onApplicationShutdown(): Promise<void> {
        await this.consumer.disconnect()
    }
}

