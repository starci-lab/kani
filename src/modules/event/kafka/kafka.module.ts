/**
 * Module for Kafka integration.
 *
 * Provides Kafka client, admin, producer, and consumer services.
 *
 * Initialization order:
 * 1. KafkaAdminService - Creates topics (if enabled)
 * 2. KafkaProducerService - Waits for admin, then connects
 * 3. KafkaConsumerService - Waits for admin, then connects
 * 4. KafkaBridgeService - Bridges Kafka events to EventEmitter
 *
 * @example
 * KafkaModule.register({
 *   clientId: 'my-app',
 *   createTopicsIfNotExists: true,
 *   usePublish: true,
 *   useConsume: true
 * })
 */
import type {
    Provider 
} from "@nestjs/common"
import {
    DynamicModule, Module
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./kafka.module-definition"
import {
    createKafkaProvider, createKafkaAdminProvider
} from "./kafka.providers"
import {
    KafkaBridgeService 
} from "./kafka-bridge.service"
import {
    KafkaAdminService 
} from "./admin.service"
import {
    KafkaProducerService 
} from "./producer.service"
import {
    KafkaConsumerService 
} from "./consumer.service"

@Module({
})
export class KafkaModule extends ConfigurableModuleClass {
    /**
     * Registers the Kafka module with configuration options.
     *
     * @param options - Kafka module configuration options
     * @returns Dynamic module with configured providers
     *
     * @example
     * KafkaModule.register({
     *   clientId: 'my-app',
     *   createTopicsIfNotExists: true,
     *   usePublish: true,
     *   useConsume: true
     * })
     */
    public static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)

        // create core providers
        const kafkaProvider = createKafkaProvider()
        const adminProvider = createKafkaAdminProvider()

        // build providers array starting with core services
        const providers: Array<Provider> = [
            // core Kafka client
            kafkaProvider,
            // admin service (must be first - creates topics)
            adminProvider,
            KafkaAdminService,
        ]

        // add producer service if publishing is enabled
        if (options?.usePublish) {
            providers.push(KafkaProducerService)
        }

        // add consumer and bridge services if consumption is enabled
        if (options?.useConsume) {
            providers.push(KafkaConsumerService)
            providers.push(KafkaBridgeService)
        }

        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers || []),
                ...providers],
            exports: providers,
        }
    }
}
