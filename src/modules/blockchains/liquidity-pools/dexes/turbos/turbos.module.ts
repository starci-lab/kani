import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./turbos.module-definition"
import { createTurbosClmmSdkProvider } from "./turbos.providers"
import { TurbosFetcherService } from "./fetcher.service"
import { TurbosActionService } from "./action.service"
import { TurbosMetadataService } from "./metadata.service"

@Injectable()
export class TurbosModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createTurbosClmmSdkProvider(),
            TurbosFetcherService,
            TurbosActionService,
            TurbosMetadataService
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