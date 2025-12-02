import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./processors.module-definition"
import { ProcessorFactoryService } from "./processor-factory.service"
import { 
    OpenPositionProcessorService, 
    ClosePositionProcessorService, 
    BalanceProcessorService 
} from "./actions"

@Module({})
export class ProcessorsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                ...dynamicModule.imports || [],
            ],
            providers: [
                ...dynamicModule.providers || [], 
                ProcessorFactoryService,
                BalanceProcessorService,
                OpenPositionProcessorService,
                ClosePositionProcessorService,
            ],
            exports: [
                ProcessorFactoryService,
            ],
        }
    }
}   