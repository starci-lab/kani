import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./runtimes.module-definition"
import {
    RuntimesFactoryService 
} from "./runtimes-factory.service"
import {
    RuntimeContextService 
} from "./runtime.context-service"

@Module({
})
export class RuntimesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            RuntimesFactoryService,
            RuntimeContextService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}   