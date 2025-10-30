import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./orca.module-definition"
import { OrcaFetcherService } from "./fetcher.service"
import { OrcaActionService } from "./action.service"
import { OrcaMetadataService } from "./metadata.service"

@Injectable()
export class OrcaModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            OrcaFetcherService,
            OrcaActionService,
            OrcaMetadataService,
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


