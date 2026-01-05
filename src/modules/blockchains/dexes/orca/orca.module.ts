import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./orca.module-definition"
import { OrcaObserverService } from "./observer.service"
import { OrcaOpenPositionActionService } from "./open-position-action.service"
import { OrcaClosePositionActionService } from "./close-position-action.service"
import { OrcaFeesService } from "./fees.service"
import { 
    TickArrayService, 
    OpenPositionInstructionService, 
    ClosePositionInstructionService, 
    PositionService 
} from "./transactions"
import { OrcaAnalyticsService } from "./analytics.service"

@Injectable()
export class OrcaModule extends ConfigurableModuleClass {
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
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.fees ?? true))
        ) {
            providers.push(TickArrayService, OrcaFeesService)
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


