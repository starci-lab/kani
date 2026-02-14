import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./workers.module-definition"
import {
    ActionModule 
} from "./action"
@Module({
    imports: [
        ActionModule.register(
            {
                isGlobal: true,
            }
        ),
    ],
})
export class WorkersModule extends ConfigurableModuleClass {}