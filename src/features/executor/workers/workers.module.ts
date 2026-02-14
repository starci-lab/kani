import {
    Module,
} from "@nestjs/common"
import {
    SharedModule 
} from "./shared"
import {
    ConfigurableModuleClass 
} from "./workers.module-definition"
import {
    ActionModule 
} from "./action"
@Module({
    imports: [
        SharedModule.register(
            {
                isGlobal: true,
            }
        ),
        ActionModule.register(
            {
                isGlobal: true,
            }
        ),
    ],
})
export class WorkersModule extends ConfigurableModuleClass {}