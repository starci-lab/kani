import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./gate.module-definition"
import { GateWsService } from "./gate-ws.service"
import { GateRestService } from "./gate-rest.service"
import { GateProcessorService } from "./gate-processor.service"

@Module({})
export class GateModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers = [
            GateWsService,
            GateRestService,
            GateProcessorService,
        ]
        return {
            ...dynamicModule,
            providers: [
                ...(dynamicModule.providers || []),
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}


