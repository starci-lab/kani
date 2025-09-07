import { DynamicModule, Module, Provider } from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./kafka.module-definition"
import { createKafkaProvider } from "./kafka.providers"
import {
    createKafkaProducerProvider,
    createKafkaConsumerProvider,
} from "./kafka.providers"
import { KafkaBridgeService } from "./kafka-bridge.service"

@Module({})
export class KafkaModule extends ConfigurableModuleClass {
    public static register(options: typeof OPTIONS_TYPE = {}): DynamicModule {
        const dynamicModule = super.register(options)
        const kafkaProvider = createKafkaProvider()
        const producerProvider = createKafkaProducerProvider()
        const consumerProvider = createKafkaConsumerProvider()
        const providers: Array<Provider> = [
            kafkaProvider,
            producerProvider,
            consumerProvider,
            KafkaBridgeService
        ]
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers || []), ...providers],
            exports: providers,
        }
    }
}
