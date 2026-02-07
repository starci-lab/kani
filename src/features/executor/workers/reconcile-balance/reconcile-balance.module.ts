import {
    Module,
} from "@nestjs/common"
import {
    ReconcileBalanceWorker,
} from "./reconcile-balance.worker"
import {
    PrepareService,
} from "./prepare.service"
import {
    ExecuteService,
} from "./execute.service"
import {
    ConfirmService,
} from "./confirm.service"
import {
    RequeueService,
} from "./requeue.service"
import {
    ConfigurableModuleClass,
} from "./reconcile-balance.module-definition"

@Module(
    {
        providers: [
            ReconcileBalanceWorker,
            PrepareService,
            ExecuteService,
            ConfirmService,
            RequeueService,
        ],
    }
)
export class ReconcileBalanceModule extends ConfigurableModuleClass {}