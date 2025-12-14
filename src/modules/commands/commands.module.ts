
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./commands.module-definition"
import { SimulateModule } from "./simulate"

@Module({
    imports: [
        SimulateModule.register({
            isGlobal: true,
        }),
    ],
})
export class CommandsModule extends ConfigurableModuleClass {}
