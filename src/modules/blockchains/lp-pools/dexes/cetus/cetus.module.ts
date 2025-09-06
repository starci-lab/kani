import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./cetus.module-definition"
import { createCetusAggregatorSdkProvider, createCetusClmmSdkProvider } from "./cetus.providers"
import { CetusFetcherService } from "./fetcher.service"
import { CetusActionService } from "./action.service"

@Injectable()
export class CetusModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createCetusClmmSdkProvider(),
            createCetusAggregatorSdkProvider(),
            CetusFetcherService,
            CetusActionService
        ]
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