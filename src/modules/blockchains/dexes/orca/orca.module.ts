import {
    DynamicModule, Injectable, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./orca.module-definition"
import {
    OrcaObserverService 
} from "./observer.service"
import {
    OrcaOpenPositionActionService 
} from "./open-position-action.service"
import {
    OrcaClosePositionActionService 
} from "./close-position-action.service"
import {
    TickArrayService,
    OpenPositionInstructionService,
    ClosePositionInstructionService,
    PositionService,
} from "./transactions"
import {
    OrcaAnalyticsService,
} from "./analytics.service"
import {
    OrcaReservesWithFeesService,
} from "./reserves-with-fees.service"

/**
 * Orca DEX module.
 * Provides services for Orca DEX integration including analytics, position management, and pool observation.
 *
 * @example
 * OrcaModule.register({ enabled: { observe: true, action: true, analytics: true } })
 */
@Injectable()
export class OrcaModule extends ConfigurableModuleClass {
    /**
     * Registers the Orca module with the specified options.
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
            providers.push(OrcaObserverService)
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.action ?? true))
        ) {
            providers.push(
                TickArrayService,
                PositionService,
                OpenPositionInstructionService,
                ClosePositionInstructionService,
                OrcaOpenPositionActionService,
                OrcaClosePositionActionService
            )
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.analytics ?? true))
        ) {
            providers.push(OrcaAnalyticsService)
        }
        if ((typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.reservesWithFees ?? true)))
        ) {
            providers.push(
                TickArrayService,
                OrcaReservesWithFeesService,
            )
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


