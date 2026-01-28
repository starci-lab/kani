import {
    DynamicModule, Injectable, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./flowx.module-definition"
import {
    FlowXObserverService 
} from "./observer.service"
import {
    FlowXOpenPositionActionService 
} from "./open-position-action.service"
import {
    FlowXClosePositionActionService 
} from "./close-position-action.service"
import {
    ClosePositionTxbService, OpenPositionTxbService 
} from "./transactions"
import {
    FlowXAnalyticsService 
} from "./analytics.service"
import {
    FlowXReservesWithFeesService,
} from "./reserves-with-fees.service"

@Injectable()
export class FlowXModule extends ConfigurableModuleClass {
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
            providers.push(FlowXObserverService)
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.action ?? true))
        ) {
            providers.push(
                OpenPositionTxbService, 
                ClosePositionTxbService, 
                FlowXOpenPositionActionService, 
                FlowXClosePositionActionService
            )
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.analytics ?? true))
        ) {
            providers.push(FlowXAnalyticsService)
        }
        if ((typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.reservesWithFees ?? true)))
        ) {
            providers.push(FlowXReservesWithFeesService)
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
