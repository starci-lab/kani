import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./pyth.module-definition"
import { createHermesClientProvider } from "./pyth.providers"
import { PythSubscriptionsService } from "./pyth-subscriptions.service"
import { PythOraclePriceService } from "./oracle-price.service"
import { PythPriceService } from "./price.service"
import { PythUtilsService } from "./pyth-utils.service"
import { PythRestService } from "./pyth-rest.service"

@Module({})
export class PythModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createHermesClientProvider(),
            PythOraclePriceService,
            PythPriceService,
            PythUtilsService,
            PythRestService,
        ]
        const utilities: Array<Provider> = []
        if (!options.utilitiesOnly) {
            utilities.push(PythSubscriptionsService)
        }
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
                ...utilities,
            ],
            exports: [
                ...dynamicModule.exports || [],
                ...providers,
            ],
        }
    }
}