import { DynamicModule, Injectable, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./flowx.module-definition"
import { createFlowXClmmSdkProvider } from "./flowx.providers"
import { FlowXActionService } from "./action.service"
import { FlowXMetadataService } from "./metadata.service"
import { FlowXFetcherService } from "./fetcher.service"

@Injectable()
export class FlowXModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            createFlowXClmmSdkProvider(),
            FlowXActionService,
            FlowXMetadataService,
            FlowXFetcherService
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
