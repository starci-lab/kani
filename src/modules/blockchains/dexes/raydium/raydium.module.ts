import {
    DynamicModule, Injectable, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./raydium.module-definition"
import {
    RaydiumObserverService 
} from "./observer.service"
import {
    RaydiumOpenPositionActionService 
} from "./open-position-action.service"
import {
    RaydiumClosePositionActionService 
} from "./close-position-action.service"
import { 
    TickArrayService, 
    PersonalPositionService,
    ClosePositionInstructionService,
    OpenPositionInstructionService
} from "./transactions"
import {
    RaydiumAnalyticsService 
} from "./analytics.service"
import {
    RaydiumReservesWithFeesService,
} from "./reserves-with-fees.service"

@Injectable()
export class RaydiumModule extends ConfigurableModuleClass {
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
            providers.push(RaydiumObserverService)
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.action ?? true))
        ) {
            providers.push(
                TickArrayService,
                PersonalPositionService,
                ClosePositionInstructionService,
                OpenPositionInstructionService,
                RaydiumOpenPositionActionService,
                RaydiumClosePositionActionService
            )
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.analytics ?? true))
        ) {
            providers.push(RaydiumAnalyticsService)
        }
        if ((typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.reservesWithFees ?? true)))
        ) {
            providers.push(
                TickArrayService,
                PersonalPositionService,
                RaydiumReservesWithFeesService,
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


