/**
 * Module for NATS integration.
 *
 * Provides NATS connection, producer, consumer, bridge to EventEmitter,
 * and stream connection factory for AsyncIterable usage.
 *
 * @example
 * NatsModule.register({ subjects: ['event.1'] })
 */
import type {
    Provider 
} from "@nestjs/common"
import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    InstanceService 
} from "@modules/mixin"
import {
    NatsBridgeService 
} from "./nats-bridge.service"
import {
    NatsMessageFactoryService 
} from "./nats-message-factory.service"
import {
    NatsProducerService 
} from "./producer.service"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./nats.module-definition"
import {
    createNatsProvider 
} from "./nats.providers"

@Module({
})
export class NatsModule extends ConfigurableModuleClass {
    public static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)

        const providers: Array<Provider> = [
            createNatsProvider(),
            NatsProducerService,
            NatsMessageFactoryService,
            NatsBridgeService,
            InstanceService,
        ]

        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers ?? []),
                ...providers],
            exports: providers,
        }
    }
}
