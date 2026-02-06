import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./gate.module-definition"
import {
    GateLastPriceService 
} from "./last-price.service"
import {
    GateOrderBookService 
} from "./order-book.service"
import {
    GateTokenRegistryService 
} from "./token-registry.service"

/**
 * Module for Gate.io exchange integration.
 * Provides services for token price tracking and order book management.
 *
 * @example
 * GateModule.register({ isGlobal: true })
 */
@Module({
})
export class GateModule extends ConfigurableModuleClass {
    /**
     * Registers the Gate.io module with all required services.
     *
     * @param options - Module configuration options
     * @returns Dynamic module with Gate.io services
     *
     * @example
     * const module = GateModule.register({ isGlobal: true })
     */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        
        // register all Gate.io services
        const providers = [
            GateLastPriceService,
            GateOrderBookService,
            GateTokenRegistryService,
        ]
        
        return {
            ...dynamicModule,
            providers: [
                ...(dynamicModule.providers || []),
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}


