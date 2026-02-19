import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ServiceName,
} from "@modules/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./event.module-definition"
import {
    KafkaModule 
} from "./kafka"
import {
    EventEmitterService 
} from "./event-emitter.service"

@Module({
})
export class EventModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const imports: Array<DynamicModule> = []
        const kafkaOptions = options?.kafka || {
            groupId: ServiceName.KaniUnknown,
        }
        imports.push(
            KafkaModule.register({
                isGlobal: options.isGlobal,
                ...kafkaOptions,
            })
        )
        const providers: Array<Provider> = [
            EventEmitterService
        ]
        return {
            ...dynamicModule,
            imports,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}   