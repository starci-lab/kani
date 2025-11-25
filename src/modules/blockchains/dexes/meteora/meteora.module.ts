import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./meteora.module-definition"
import { MeteoraObserverService } from "./observer.service"
import { MeteoraActionService } from "./action.service"
import { EventAuthorityService, OpenPositionInstructionService, MeteoraSdkService } from "./transactions"
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


