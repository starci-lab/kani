import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./coinmarketcap.module-definition"
import { CoinMarketCapRestService } from "./coinmarketcap-rest.service"
import { CoinMarketCapUtilsService } from "./coinmarketcap-utils.service"

@Module({})
export class CoinMarketCapModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            CoinMarketCapUtilsService,
            CoinMarketCapRestService,
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
