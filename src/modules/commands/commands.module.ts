
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./commands.module-definition"
import { GoogleapisModule } from "./googleapis"
import { SeedModule } from "./seed"
import { LocalModule } from "./local"
@Module({
    imports: [
        GoogleapisModule.register(
            {
                isGlobal: true,
            }
        ),
        SeedModule.register(
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
