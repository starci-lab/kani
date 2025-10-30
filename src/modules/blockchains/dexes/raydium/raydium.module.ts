import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./raydium.module-definition"
import { RaydiumFetcherService } from "./fetcher.service"
import { RaydiumActionService } from "./action.service"
import { RaydiumMetadataService } from "./metadata.service"

@Injectable()
export class RaydiumModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            RaydiumFetcherService,
            RaydiumActionService,
            RaydiumMetadataService,
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


