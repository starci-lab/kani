import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./coingecko.module-definition"
import {
    CoingeckoTokenRegistryService 
} from "./token-registry.service"
import {
    CoingeckoRestService 
} from "./rest.service"

@Module({
})
export class CoingeckoModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            CoingeckoTokenRegistryService,
            CoingeckoRestService,
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