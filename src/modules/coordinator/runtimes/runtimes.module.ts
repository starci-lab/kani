import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./runtimes.module-definition"
import { RuntimesFactoryService } from "./runtimes-factory.service"
import { RuntimeRequestService } from "./runtime.request-service"

@Module({})
export class RuntimesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            RuntimesFactoryService,
            RuntimeRequestService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}   