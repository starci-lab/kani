import {
    DynamicModule, Injectable, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./momentum.module-definition"
import {
    OpenPositionTxbService, ClosePositionTxbService 
} from "./transactions"
import {
    MomentumObserverService 
} from "./observer.service"
import {
    MomentumOpenPositionActionService 
} from "./open-position-action.service"
import {
    MomentumClosePositionActionService 
} from "./close-position-action.service"
import {
    MomentumAnalyticsService 
} from "./analytics.service"
import {
    MomentumReservesWithFeesService,
} from "./reserves-with-fees.service"
/**
 * Momentum DEX module.
 * Provides services for Momentum DEX integration including analytics, position management, and pool observation.
 *
 * @example
 * MomentumModule.register({ enabled: { observe: true, action: true, analytics: true } })
 */
@Injectable()
export class MomentumModule extends ConfigurableModuleClass {
    /**
     * Registers the Momentum module with the specified options.
     *
     * @param options - Module configuration options
     * @returns Dynamic module configuration
     */
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = []
        if (
            typeof options.enabled === "boolean" 
                ? options.enabled
                : (typeof options.enabled === "undefined" ? true : (options.enabled?.observe ?? true))
        ) {
            providers.push(MomentumObserverService)
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.action ?? true))
        ) {
            providers.push(
                OpenPositionTxbService, 
                ClosePositionTxbService, 
                MomentumOpenPositionActionService, 
                MomentumClosePositionActionService
            )
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.analytics ?? true))
        ) {
            providers.push(MomentumAnalyticsService)
        }
        if ((typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.reservesWithFees ?? true)))
        ) {
            providers.push(MomentumReservesWithFeesService)
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
