
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./key.module-definition"
import { KeyCommand } from "./key.command"
import { GenerateCommand } from "./subs"
@Module({
    providers: [
        KeyCommand,
        GenerateCommand,
    ],
})
export class KeyModule extends ConfigurableModuleClass {}
