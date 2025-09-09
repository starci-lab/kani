import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./bybit.module-definition"   
import { BybitWsService } from "./bybit-ws.service"
import { BybitRestService } from "./bybit-rest.service"
import { BybitProcessorService } from "./bybit-processor.service"

@Module({})
export class BybitModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers = [
            BybitWsService,
            BybitRestService,
            BybitProcessorService,
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


