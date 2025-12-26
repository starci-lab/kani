import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./workers.module-definition"
import { ClosePositionWorker } from "./close-position.worker"
import { OpenPositionWorker } from "./open-position.worker"
import { ReconcileBalanceWorker } from "./reconcile-balance.worker"

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
                ClosePositionWorker,
                OpenPositionWorker,
                ReconcileBalanceWorker,
            ],
        }
    }
}   