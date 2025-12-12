import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./pyth.module-definition"
import { createHermesClientProvider } from "./pyth.providers"
import { PythService } from "./pyth.service"
import { OraclePriceService } from "./oracle-price.service"

@Module({})
export class PythModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            OraclePriceService,
        ]
        if (!options.utilitiesOnly) {
            providers.push(createHermesClientProvider())
            providers.push(PythService)
        }
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...dynamicModule.exports || [],
                OraclePriceService,
            ],
        }
    }
}