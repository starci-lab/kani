
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./database.module-definition"
import { BackupCommand, RestoreCommand, SeedCommand } from "./subs"
import { DatabaseCommand } from "./database.command"
@Module({
    providers: [
        DatabaseCommand,
        BackupCommand,
        RestoreCommand,
        SeedCommand,
    ],
})
export class DatabaseModule extends ConfigurableModuleClass {}
