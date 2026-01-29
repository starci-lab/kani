
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./commands.module-definition"
import {
    CoreModule,
} from "./core"
import {
    LocalModule 
} from "./local"
@Module({
    imports: [
        CoreModule.register(
            {
                isGlobal: true,
            }
        ),
        LocalModule.register(
            {
                isGlobal: true,
            }
        ),
    ],
})
export class CommandsModule extends ConfigurableModuleClass {}
