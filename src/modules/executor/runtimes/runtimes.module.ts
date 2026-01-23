import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./runtimes.module-definition"
import {
    RuntimesFactoryService 
} from "./runtimes-factory.service"
import {
    RuntimeContextService 
} from "./runtime.context-service"
import {
    HandleClmmPositionOpenRequestedEventService, 
    HandleDlmmPositionOpenRequestedEventService,
    HandleReconcileBalanceService,
} from "./core"
import {
    ReconcileBalanceModule
} from "../workers/reconcile-balance/reconcile-balance.module"

@Module({
})
export class RuntimesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                ...dynamicModule.imports || [],
                ReconcileBalanceModule,
            ],
            providers: [
                ...dynamicModule.providers || [], 
                RuntimesFactoryService,
                RuntimeContextService,
                HandleClmmPositionOpenRequestedEventService,
                HandleDlmmPositionOpenRequestedEventService,
                HandleReconcileBalanceService,
            ],
            exports: [
                RuntimesFactoryService,
                RuntimeContextService,
            ],
        }
    }
}   