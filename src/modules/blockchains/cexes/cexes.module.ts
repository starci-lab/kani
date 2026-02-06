import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./cexes.module-definition"   
import {
    BinanceModule 
} from "./binance"
import {
    GateModule 
} from "./gate"
import {
    BybitModule 
} from "./bybit"

/**
 * Module for managing centralized exchange (CEX) integrations.
 * Registers and configures Binance, Gate, and Bybit modules.
 *
 * @example
 * CexesModule.register({ isGlobal: true })
 */
@Module({
})
export class CexesModule extends ConfigurableModuleClass {
    /**
     * Registers the CEX module with all exchange submodules.
     *
     * @param options - Module configuration options
     * @returns Dynamic module with all CEX integrations
     *
     * @example
     * const module = CexesModule.register({ isGlobal: true })
     */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        
        // register all exchange modules
        const modules = [
            BinanceModule.register({
                isGlobal: options.isGlobal
            }),
            GateModule.register({
                isGlobal: options.isGlobal
            }),
            BybitModule.register({
                isGlobal: options.isGlobal
            }),
        ]
        
        return {
            ...dynamicModule,
            imports: [
                ...modules,
            ],
            providers: [
                ...dynamicModule.providers || [],
            ],
            exports: [
                ...modules,
            ],
        }
    }
}