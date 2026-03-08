
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./database.module-definition"
import {
    BackupCommand, 
    RestoreCommand, 
    SeedCommand, 
    MigratePositionBalanceValuesCommand, 
    MigrateAvatarsCommand, 
    MigrateUserTotpCommand, 
    MigrateBotExecutorCommand,
    MigrateIndicatorsCommand,
    SetBotsRangeTierMidCommand,
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
        MigrateBotExecutorCommand,
        MigrateIndicatorsCommand,
        DatabaseCommand,
        SetBotsRangeTierMidCommand,
    ],
})
export class DatabaseModule extends ConfigurableModuleClass {}
