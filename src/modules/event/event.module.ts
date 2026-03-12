import type { Provider } from "@nestjs/common"
import { DynamicModule, Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./event.module-definition"
import { EventEmitterService } from "./event-emitter.service"
import { NatsModule } from "./nats"

@Module({})
export class EventModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const natsOptions = options?.nats ?? {}
        const imports: Array<DynamicModule> = [
            NatsModule.register({
                isGlobal: options.isGlobal,
                ...natsOptions,
            }),
        ]
        const providers: Array<Provider> = [EventEmitterService]
        return {
            ...dynamicModule,
            imports,
            providers: [...(dynamicModule.providers ?? []), ...providers],
            exports: [...providers],
        }
    }
}   