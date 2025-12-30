
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./seed.module-definition"
import { BackupCommand, RestoreCommand } from "./subs"
@Module({
    providers: [
        BackupCommand,
        RestoreCommand,
    ],
})
export class GoogleapisModule extends ConfigurableModuleClass {}
