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
    LockAuthorityService
} from "./core"
import {
    ReconcileBalanceWorker 
} from "./workers"

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
            ],
            providers: [
                ...dynamicModule.providers || [], 
                RuntimesFactoryService,
                RuntimeContextService,
                LockAuthorityService,
                HandleClmmPositionOpenRequestedEventService,
                HandleDlmmPositionOpenRequestedEventService,
                HandleReconcileBalanceService,
                ReconcileBalanceWorker,
            ],
            exports: [
                RuntimesFactoryService,
                RuntimeContextService,
            ],
        }
    }
}   