
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./database.module-definition"
import {
    BackupCommand, RestoreCommand, SeedCommand, MigratePositionBalanceValuesCommand 
} from "./subs"
import {
    DatabaseCommand 
} from "./database.command"
@Module({
    providers: [
        DatabaseCommand,
        BackupCommand,
        RestoreCommand,
        SeedCommand,
        MigratePositionBalanceValuesCommand,
    ],
})
export class DatabaseModule extends ConfigurableModuleClass {}
