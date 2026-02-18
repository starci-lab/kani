import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./action.module-definition"
import {
    ActionWorker,
} from "./action.worker"
import {
    CancelService,
} from "./cancel.service"
import {
    OnCompletedService,
} from "./on-completed.service"
import {
    OnFailedService,
} from "./on-failed.service"
import {
    SendHeartbeatService,
} from "./send-heartbeat.service"
import {
    JobContextService,
    LiquidityPoolContextService,
} from "./context"
import { 
    ClosePositionTaskDispatchService, 
    ClosePositionTaskPrepareService,
    ClosePositionTaskSignService,
    ClosePositionTaskExecuteService,
    ClosePositionTaskConfirmService,
    WithdrawTaskPrepareService,
    WithdrawTaskSignService,
    WithdrawTaskExecuteService,
    WithdrawTaskConfirmService,
    WithdrawTaskDispatchService,
    ReconcileBalanceTaskPrepareService,
    ReconcileBalanceTaskSignService,
    ReconcileBalanceTaskExecuteService,
    ReconcileBalanceTaskConfirmService,
    ReconcileBalanceTaskDispatchService,
    OpenPositionTaskPrepareService,
    OpenPositionTaskSignService,
    OpenPositionTaskExecuteService,
    OpenPositionTaskConfirmService,
    OpenPositionTaskDispatchService,
} from "./tasks"
import {
    ActionRequeueService 
} from "./requeue.service"
import {
    JobTaskService,
    JobStepService,
} from "./update"
    
@Module(
    {
        providers: [
            ActionWorker,
            CancelService,
            OnCompletedService,
            OnFailedService,
            SendHeartbeatService,
            JobContextService,
            LiquidityPoolContextService,
            SendHeartbeatService,
            ClosePositionTaskPrepareService,
            ClosePositionTaskSignService,
            ClosePositionTaskExecuteService,
            ClosePositionTaskConfirmService,
            ClosePositionTaskDispatchService,
            WithdrawTaskPrepareService,
            WithdrawTaskSignService,
            WithdrawTaskExecuteService,
            WithdrawTaskConfirmService,
            WithdrawTaskDispatchService,
            ReconcileBalanceTaskPrepareService,
            ReconcileBalanceTaskSignService,
            ReconcileBalanceTaskExecuteService,
            ReconcileBalanceTaskConfirmService,
            ReconcileBalanceTaskDispatchService,
            OpenPositionTaskPrepareService,
            OpenPositionTaskSignService,
            OpenPositionTaskExecuteService,
            OpenPositionTaskConfirmService,
            OpenPositionTaskDispatchService,
            ActionRequeueService,
            JobTaskService,
            JobStepService,
        ],
    }
)
export class ActionModule extends ConfigurableModuleClass {}