
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./database.module-definition"
import {
    BackupCommand, RestoreCommand, SeedCommand, MigratePositionBalanceValuesCommand, MigrateAvatarsCommand, MigrateUserTotpCommand 
} from "./subs"
import {
    DatabaseCommand 
} from "./database.command"
@Module({
    providers: [
        BackupCommand,
        RestoreCommand,
        SeedCommand,
        MigratePositionBalanceValuesCommand,
        MigrateAvatarsCommand,
        MigrateUserTotpCommand,
        DatabaseCommand,
    ],
})
export class DatabaseModule extends ConfigurableModuleClass {}
