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

@Module({
    providers: [
        ReconcileBalanceWorker,
        PrepareService,
        ExecuteService,
        SendHeartbeatService,
        ConfirmService,
        OnCompletedService,
        OnFailedService,
        RequeueService,
    ],
})
export class ReconcileBalanceModule {}