import {
    Module,
} from "@nestjs/common"
import {
    ClearService,
    OnCompletedService,
    OnFailedService,
    SendHeartbeatService,
} from "../common"
import {
    WithdrawWorker,
} from "./withdraw.worker"
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
} from "./withdraw.module-definition"

@Module(
    {
        providers: [
            WithdrawWorker,
            PrepareService,
            ExecuteService,
            SendHeartbeatService,
            ConfirmService,
            OnCompletedService,
            OnFailedService,
            RequeueService,
            ClearService,
        ],
    }
)
export class WithdrawModule extends ConfigurableModuleClass {}