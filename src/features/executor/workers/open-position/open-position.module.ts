import {
    Module,
} from "@nestjs/common"
import {
    PrepareService,
} from "./prepare.service"
import {
    OpenPositionWorker,
} from "./open-position.worker"
import {
    ExecuteService,
} from "./execute.service"
import {
    ConfirmService,
} from "./confirm.service"
import {
    ConfigurableModuleClass,
} from "./open-position.module-definition"
import {
    RequeueService,
} from "./requeue.service"

@Module(
    {
        providers: [
            OpenPositionWorker,
            PrepareService,
            ExecuteService,
            ConfirmService,
            RequeueService,
        ],
    }
)
export class OpenPositionModule extends ConfigurableModuleClass {}