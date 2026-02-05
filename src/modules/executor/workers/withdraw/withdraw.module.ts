import {
    Module,
} from "@nestjs/common"
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
    SendHeartbeatService,
} from "./send-heartbeat.service"
import {
    ConfirmService,
} from "./confirm.service"
import {
    OnCompletedService,
} from "./on-completed.service"
import {
    OnFailedService,
} from "./on-failed.service"
import {
    RequeueService,
} from "./requeue.service"
import {
    ClearService,
} from "./clear.service"
import {
    ConfigurableModuleClass,
} from "./withdraw.module-definition"

@Module({
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
})
export class WithdrawModule extends ConfigurableModuleClass {}