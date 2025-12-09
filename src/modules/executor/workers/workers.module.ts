import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./workers.module-definition"
import { ClosePositionConfirmationWorker } from "./close-position-confirmation.worker"
import { OpenPositionConfirmationWorker } from "./open-position-confirmation.worker"
import { SwapConfirmationWorker } from "./swap-confirmation.worker"

@Module({})
export class WorkersModule extends ConfigurableModuleClass {
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
                ClosePositionConfirmationWorker,
                OpenPositionConfirmationWorker,
                SwapConfirmationWorker,
            ],
        }
    }
}   