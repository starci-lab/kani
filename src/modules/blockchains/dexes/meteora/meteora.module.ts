import {
    DynamicModule, Injectable, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./meteora.module-definition"
import {
    MeteoraObserverService 
} from "./observer.service"
import {
    MeteoraOpenPositionActionService 
} from "./open-position-action.service"
import {
    MeteoraClosePositionActionService 
} from "./close-position-action.service"
import { 
    EventAuthorityService, 
    OpenPositionInstructionService, 
    MeteoraSdkService, 
    ClosePositionInstructionService 
} from "./transactions"
import {
    MeteoraAnalyticsService 
} from "./analytics.service"
import {
    MeteoraReservesWithFeesService,
} from "./reserves-with-fees.service"

/**
 * Meteora DEX module.
 * Provides services for Meteora DEX integration including analytics, position management, and pool observation.
 *
 * @example
 * MeteoraModule.register({ enabled: { observe: true, action: true, analytics: true } })
 */
@Injectable()
export class MeteoraModule extends ConfigurableModuleClass {
    /**
     * Registers the Meteora module with the specified options.
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
            providers.push(MeteoraObserverService)
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.action ?? true))
        ) {
            providers.push(
                OpenPositionInstructionService,
                EventAuthorityService,
                MeteoraSdkService,
                ClosePositionInstructionService,
                MeteoraOpenPositionActionService, 
                MeteoraClosePositionActionService
            )
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.analytics ?? true))
        ) {
            providers.push(MeteoraAnalyticsService)
        }
        if ((typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.reservesWithFees ?? true)))
        ) {
            providers.push(MeteoraReservesWithFeesService)
        }
        return {
            ...dynamicModule    ,
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


