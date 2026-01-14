
import { DynamicModule, Module, Provider } from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./cache.module-definition"
import {
    createRedisCacheManagerProvider, 
    createMemoryCacheManagerProvider 
} from "./cache.providers"
import { CacheService } from "./cache.service"
import { CachePriceUtilsService } from "./price-utils.service"
@Module({})
export class CacheModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createRedisCacheManagerProvider(),
            createMemoryCacheManagerProvider(),
            CacheService,
            CachePriceUtilsService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers, CachePriceUtilsService],
        }
    }
}
