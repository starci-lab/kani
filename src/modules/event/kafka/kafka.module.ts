/**
 * Kafka Module
 * 
 * Provides Kafka client, admin, producer, and consumer services.
 * 
 * Initialization order:
 * 1. KafkaAdminService - Creates topics (if enabled)
 * 2. KafkaProducerService - Waits for admin, then connects
 * 3. KafkaConsumerService - Waits for admin, then connects
 * 4. KafkaBridgeService - Bridges Kafka events to EventEmitter
 */

import { DynamicModule, Module, Provider } from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./kafka.module-definition"
import { createKafkaProvider } from "./kafka.providers"
import { createKafkaAdminProvider } from "./kafka.providers"
import { KafkaBridgeService } from "./kafka-bridge.service"
import { KafkaAdminService } from "./admin.service"
import { KafkaProducerService } from "./producer.service"
import { KafkaConsumerService } from "./consumer.service"

@Module({})
export class KafkaModule extends ConfigurableModuleClass {
    public static register(options: typeof OPTIONS_TYPE = {}): DynamicModule {
        const dynamicModule = super.register(options)
        
        // Core providers
        const kafkaProvider = createKafkaProvider()
        const adminProvider = createKafkaAdminProvider()
        
        const providers: Array<Provider> = [
            // Core Kafka client
            kafkaProvider,
            // Admin (must be first - creates topics)
            adminProvider,
            KafkaAdminService,
            KafkaProducerService,
            KafkaConsumerService,
            // Bridge (uses consumer)
            KafkaBridgeService,
        ]
        
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers || []), ...providers],
            exports: providers,
        }
    }
}
