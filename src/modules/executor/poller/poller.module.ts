import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./poller.module-definition"
import { OpenPositionFailedJobsPollerService } from "./open-position-failed-jobs.service"
import { ClosePositionFailedJobsPollerService } from "./close-position-failed-jobs.service"
import { ReconcileBalanceFailedJobsPollerService } from "./reconcile-balance-failed-jobs.service"


@Module({})
export class PollerModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = [
            OpenPositionFailedJobsPollerService,
            ClosePositionFailedJobsPollerService,
            ReconcileBalanceFailedJobsPollerService,
        ]
        return {
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}   