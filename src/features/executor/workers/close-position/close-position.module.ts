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
    RequeueService,
} from "./requeue.service"

@Module(
    {
        providers: [
            ClosePositionWorker,
            PrepareService,
            ExecuteService,
            ConfirmService,
            RequeueService,
        ],
    }
)
export class ClosePositionModule extends ConfigurableModuleClass {}


