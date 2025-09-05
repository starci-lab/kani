
import { DynamicModule, Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./cache.module-definition"
import {
    createRedisCacheManagerProvider, 
    createMemoryCacheManagerProvider 
} from "./cache.providers"
import { CacheHelpersService } from "./cache-helpers.service"
import { CacheType } from "./types"

@Module({})
export class CacheModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const types = options.types ?? [CacheType.Redis, CacheType.Memory]
        const providers = types.map(type => {
            switch (type) {
            case CacheType.Redis:
                return createRedisCacheManagerProvider()
            case CacheType.Memory:
                return createMemoryCacheManagerProvider()
            }
        })
        providers.push(CacheHelpersService)
        return {
            ...dynamicModule,
            providers,
            exports: [...providers],
        }
    }
}
