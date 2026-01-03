
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./commands.module-definition"
import { DatabaseModule } from "./cloud/database"
import { LocalModule } from "./local"
@Module({
    imports: [
        DatabaseModule.register(
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
