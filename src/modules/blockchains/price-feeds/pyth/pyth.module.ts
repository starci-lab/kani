import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./pyth.module-definition"
import { createHermesClientProvider } from "./pyth.providers"
import { PythUtilsService } from "./pyth-utils.service"
import { PythRestService } from "./pyth-rest.service"
import { PythSubscriptionsService } from "./pyth-subscriptions.service"

@Module({})
export class PythModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createHermesClientProvider(),
            PythUtilsService,
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