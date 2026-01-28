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

@Injectable()
export class TurbosModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
           
        ]
        if (
            typeof options.enabled === "boolean" 
                ? options.enabled
                : (typeof options.enabled === "undefined" ? true : (options.enabled?.observe ?? true))
        ) {
            providers.push(TurbosObserverService)
        }
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
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.analytics ?? true))
        ) {
            providers.push(TurbosAnalyticsService)
        }
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