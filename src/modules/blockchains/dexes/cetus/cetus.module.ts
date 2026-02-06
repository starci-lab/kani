import {
    DynamicModule, Injectable, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./cetus.module-definition"
import {
    CetusObserverService 
} from "./observer.service"
import {
    ClosePositionTxbService, OpenPositionTxbService 
} from "./transactions"
import {
    CetusOpenPositionActionService 
} from "./open-position-action.service"
import {
    CetusAnalyticsService 
} from "./analytics.service"
import {
    CetusClosePositionActionService 
} from "./close-position-action.service"
import {
    CetusReservesWithFeesService,
} from "./reserves-with-fees.service"

/**
 * NestJS module for Cetus DEX integration.
 * Provides services for observing pools, opening/closing positions, analytics, and reserves with fees.
 *
 * @example
 * CetusModule.register({ enabled: { observe: true, action: true } })
 */
@Injectable()
export class CetusModule extends ConfigurableModuleClass {
    /**
     * Registers the Cetus module with conditional service providers based on enabled features.
     *
     * @param options - Module configuration options
     * @returns Dynamic module with configured services
     *
     * @example
     * const module = CetusModule.register({ enabled: { observe: true, action: true } })
     */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        
        // register providers based on enabled features
        const providers: Array<Provider> = []
        
        // register observer service if enabled
        if (
            typeof options.enabled === "boolean" 
                ? options.enabled
                : (typeof options.enabled === "undefined" ? true : (options.enabled?.observe ?? true))
        ) {
            providers.push(CetusObserverService)
        }
        
        // register action services if enabled
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.action ?? true))
        ) {
            providers.push(
                OpenPositionTxbService, 
                ClosePositionTxbService, 
                CetusOpenPositionActionService, 
                CetusClosePositionActionService
            )
        }
        
        // register analytics service if enabled
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.analytics ?? true))
        ) {
            providers.push(CetusAnalyticsService)
        }
        
        // register reserves with fees service if enabled
        if ((typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.reservesWithFees ?? true)))
        ) {
            providers.push(CetusReservesWithFeesService)
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