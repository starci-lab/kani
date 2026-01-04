import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./meteora.module-definition"
import { MeteoraObserverService } from "./observer.service"
import { MeteoraOpenPositionActionService } from "./open-position-action.service"
import { MeteoraClosePositionActionService } from "./close-position-action.service"
import { 
    EventAuthorityService, 
    OpenPositionInstructionService, 
    MeteoraSdkService, 
    ClosePositionInstructionService 
} from "./transactions"
import { MeteoraAnalyticsService } from "./analytics.service"

@Injectable()
export class MeteoraModule extends ConfigurableModuleClass {
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


