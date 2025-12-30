
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./commands.module-definition"
import { GoogleapisModule } from "./googleapis"

@Module({
    imports: [
        GoogleapisModule.register(
            {
                isGlobal: true,
            }
        ),
    ],
})
export class CommandsModule extends ConfigurableModuleClass {}
