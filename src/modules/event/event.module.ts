import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./event.module-definition"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { EventType } from "./types"
import { KafkaModule } from "./kafka"
import { EventEmitterService } from "./event-emitter.service"

@Module({})
export class EventModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const imports: Array<DynamicModule> = []
        if (!options.types || options.types.includes(EventType.Internal)) {
            imports.push(EventEmitterModule.forRoot())
        }
        if (!options.types || options.types.includes(EventType.Kafka)) {
            imports.push(KafkaModule.register({
                isGlobal: options.isGlobal,
            }))
        }
        const providers: Array<Provider> = [
            EventEmitterService
        ]
        return {
            ...dynamicModule,
            imports,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}   