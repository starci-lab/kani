import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./close-position.module-definition"
import {
    ClosePositionWorker,
} from "./close-position.worker"
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
    SendHeartbeatService,
} from "./send-heartbeat.service"
import {
    OnCompletedService,
} from "./on-completed.service"
import {
    OnFailedService,
} from "./on-failed.service"
import {
    ClearService,
} from "./clear.service"
import {
    RequeueService,
} from "./requeue.service"

@Module(
    {
        providers: [
            ClosePositionWorker,
            PrepareService,
            ExecuteService,
            ConfirmService,
            SendHeartbeatService,
            OnCompletedService,
            OnFailedService,
            ClearService,
            RequeueService,
        ],
    }
)
export class ClosePositionModule extends ConfigurableModuleClass {}


