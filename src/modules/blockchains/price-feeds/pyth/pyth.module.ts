import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./pyth.module-definition"
import {
    createHermesClientProvider 
} from "./pyth.providers"
import {
    PythTokenRegistryService 
} from "./token-registry.service"
import {
    PythRestService 
} from "./rest.service"
import {
    PythSubscriptionsService 
} from "./subscriptions.service"

/**
 * Module for Pyth network price feed integration.
 * Provides REST and WebSocket subscription services for fetching token prices.
 *
 * @example
 * PythModule.register({ isGlobal: true })
 */
@Module({
})
export class PythModule extends ConfigurableModuleClass {
    /**
     * Registers the Pyth module with specified options.
     * Configures providers for Hermes client, token registry, REST service, and subscriptions.
     *
     * @param options - Module configuration options
     * @returns Configured dynamic module with all providers
     *
     * @example
     * const module = PythModule.register({ isGlobal: true })
     */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        // Register base configurable module
        const dynamicModule = super.register(options)
        // Define all service providers
        const providers: Array<Provider> = [
            createHermesClientProvider(),
            PythTokenRegistryService,
            PythRestService,
            PythSubscriptionsService
        ]
        // Merge with base module providers and exports
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