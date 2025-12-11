import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./meteora.module-definition"
import { MeteoraObserverService } from "./observer.service"
import { MeteoraActionService } from "./action.service"
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
        const providers: Array<Provider> = [
            OpenPositionInstructionService,
            EventAuthorityService,
            MeteoraSdkService,
            ClosePositionInstructionService,
        ]
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
            providers.push(MeteoraActionService)
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


