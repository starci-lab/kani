import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./pyth.module-definition"
import {
    createHermesClientProvider 
} from "./pyth.providers"
import {
    PythTokenRegistryService 
} from "./token-registry.service"
import {
    PythRestService 
} from "./rest.service"
import {
    PythSubscriptionsService 
} from "./subscriptions.service"

@Module({
})
export class PythModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createHermesClientProvider(),
            PythTokenRegistryService,
            PythRestService,
            PythSubscriptionsService
        ]
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...dynamicModule.exports || [],
                ...providers,
            ],
        }
    }
}