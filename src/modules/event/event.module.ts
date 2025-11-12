import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./event.module-definition"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { KafkaModule } from "./kafka"
import { EventEmitterService } from "./event-emitter.service"

@Module({})
export class EventModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const imports: Array<DynamicModule> = []
        imports.push(EventEmitterModule.forRoot())
        imports.push(KafkaModule.register({
            isGlobal: options.isGlobal,
        }))
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