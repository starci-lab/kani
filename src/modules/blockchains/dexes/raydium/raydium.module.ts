import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./raydium.module-definition"
import { RaydiumObserverService } from "./observer.service"
import { RaydiumActionService } from "./action.service"
import { createRaydiumClmmSdkProvider } from "./raydium.providers"
import { 
    TickArrayService, 
    PersonalPositionService,
    ClosePositionInstructionService,
    OpenPositionInstructionService
} from "./transactions"

@Injectable()
export class RaydiumModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createRaydiumClmmSdkProvider(),
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
            providers.push(RaydiumActionService)
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


