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
    DispatcherUtilsService
} from "./tasks"

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
            DispatcherUtilsService,
        ],
    }
)
export class ActionModule extends ConfigurableModuleClass {}