import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./binance.module-definition"   
import {
    BinanceLastPriceService 
} from "./last-price.service"
import {
    BinanceTokenRegistryService 
} from "./token-registry.service"
import {
    BinanceTradeVolumeService 
} from "./trade-volume.service"

/**
 * Module for Binance exchange integration.
 * Provides services for token price tracking and order book management.
 *
 * @example
 * BinanceModule.register({ isGlobal: true })
 */
@Module({
})
export class BinanceModule extends ConfigurableModuleClass {
    /**
     * Registers the Binance module with all required services.
     *
     * @param options - Module configuration options
     * @returns Dynamic module with Binance services
     *
     * @example
     * const module = BinanceModule.register({ isGlobal: true })
     */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        // register all Binance services
        const providers = [
            BinanceLastPriceService,
            BinanceTokenRegistryService,
            BinanceTradeVolumeService,
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