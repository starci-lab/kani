import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./raydium.module-definition"
import { RaydiumObserverService } from "./observer.service"
import { RaydiumOpenPositionActionService } from "./open-position-action.service"
import { RaydiumClosePositionActionService } from "./close-position-action.service"
import { 
    TickArrayService, 
    PersonalPositionService,
    ClosePositionInstructionService,
    OpenPositionInstructionService
} from "./transactions"
import { RaydiumAnalyticsService } from "./analytics.service"

@Injectable()
export class RaydiumModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            TickArrayService,
            PersonalPositionService,
            ClosePositionInstructionService,
            OpenPositionInstructionService,
        ]
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
            providers.push(RaydiumOpenPositionActionService)
            providers.push(RaydiumClosePositionActionService)
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.analytics ?? true))
        ) {
            providers.push(RaydiumAnalyticsService)
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


