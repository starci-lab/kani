import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./action.module-definition"
import {
    ActionWorker,
} from "./action.worker"
@Module(
    {
        providers: [
            ActionWorker,
        ],
    }
)
export class ActionModule extends ConfigurableModuleClass {}