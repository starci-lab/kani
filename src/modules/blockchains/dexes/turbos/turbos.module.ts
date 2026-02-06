import {
    DynamicModule, Injectable, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./turbos.module-definition"
import {
    ClosePositionTxbService, OpenPositionTxbService 
} from "./transactions"
import {
    TurbosOpenPositionActionService 
} from "./open-position-action.service"
import {
    TurbosClosePositionActionService 
} from "./close-position-action.service"
import {
    TurbosObserverService 
} from "./observer.service"
import {
    TurbosAnalyticsService 
} from "./analytics.service"
import {
    TurbosReservesWithFeesService,
} from "./reserves-with-fees.service"

/**
 * Turbos DEX module.
 * Provides services for Turbos DEX integration including analytics, position management, and pool observation.
 *
 * @example
 * TurbosModule.register({ enabled: { observe: true, action: true, analytics: true } })
 */
@Injectable()
export class TurbosModule extends ConfigurableModuleClass {
    /**
     * Registers the Turbos module with conditional service providers based on enabled features.
     *
     * @param options - Module configuration options
     * @returns Dynamic module with configured services
     *
     * @example
     * const module = TurbosModule.register({ enabled: { observe: true, action: true } })
     */
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        
        // register providers based on enabled features
        const providers: Array<Provider> = []
        // register observer service if enabled
        if (
            typeof options.enabled === "boolean" 
                ? options.enabled
                : (typeof options.enabled === "undefined" ? true : (options.enabled?.observe ?? true))
        ) {
            providers.push(TurbosObserverService)
        }
        
        // register action services if enabled
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.action ?? true))
        ) {
            providers.push(
                OpenPositionTxbService,
                ClosePositionTxbService,
                TurbosOpenPositionActionService,
                TurbosClosePositionActionService    
            )
        }
        
        // register analytics service if enabled
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.analytics ?? true))
        ) {
            providers.push(TurbosAnalyticsService)
        }
        
        // register reserves with fees service if enabled
        if ((typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.reservesWithFees ?? true)))
        ) {
            providers.push(TurbosReservesWithFeesService)
        }
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