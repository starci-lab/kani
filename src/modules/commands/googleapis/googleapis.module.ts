
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./googleapis.module-definition"
import { BackupCommand, RestoreCommand } from "./subs"
import { GoogleapisCommand } from "./googleapis.command"
@Module({
    providers: [
        GoogleapisCommand,
        BackupCommand,
        RestoreCommand,
    ],
})
export class GoogleapisModule extends ConfigurableModuleClass {}
