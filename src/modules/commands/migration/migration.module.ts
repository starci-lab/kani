
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./migration.module-definition"
import { BackupCommand, RestoreCommand } from "./subs"
import { GoogleapisCommand } from "./migration.command"
@Module({
    providers: [
        GoogleapisCommand,
        BackupCommand,
        RestoreCommand,
    ],
})
export class GoogleapisModule extends ConfigurableModuleClass {}
