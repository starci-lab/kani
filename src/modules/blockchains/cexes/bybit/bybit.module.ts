import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./bybit.module-definition"   
import {
    BybitLastPriceService 
} from "./last-price.service"
import {
    BybitOrderBookService 
} from "./order-book.service"
import {
    BybitTokenRegistryService 
} from "./token-registry.service"

/**
 * Module for Bybit exchange integration.
 * Provides services for token price tracking and order book management.
 *
 * @example
 * BybitModule.register({ isGlobal: true })
 */
@Module({
})
export class BybitModule extends ConfigurableModuleClass {
    /**
     * Registers the Bybit module with all required services.
     *
     * @param options - Module configuration options
     * @returns Dynamic module with Bybit services
     *
     * @example
     * const module = BybitModule.register({ isGlobal: true })
     */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        
        // register all Bybit services
        const providers = [
            BybitLastPriceService,
            BybitOrderBookService,
            BybitTokenRegistryService,
        ]
        
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}


