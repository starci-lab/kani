
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./stimulate.module-definition"
import { SimulatePositionsCommand } from "./subs"
import { SimulateCommand } from "./stimulate.command"
@Module({
    providers: [
        SimulateCommand,
        SimulatePositionsCommand,
    ],
})
export class SimulateModule extends ConfigurableModuleClass {}
