import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./coinmarketcap.module-definition"
import {
    CoinMarketCapRestService 
} from "./rest.service"
import {
    CoinMarketCapTokenRegistryService 
} from "./token-registry.service"

@Module({
})
export class CoinMarketCapModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            CoinMarketCapTokenRegistryService,
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
