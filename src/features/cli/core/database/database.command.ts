
import {
    Command, CommandRunner 
} from "nest-commander"
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
    WinstonLog, WinstonService 
} from "@modules/winston"

@Command({
    name: "db",
    description: "manage db actions",
    subCommands: [
        BackupCommand,
        RestoreCommand,
        SeedCommand,
        MigratePositionBalanceValuesCommand,
        MigrateAvatarsCommand,
        MigrateUserTotpCommand,
        MigrateBotExecutorCommand,
        MigrateIndicatorsCommand,
        SetBotsRangeTierMidCommand,
    ],
})
export class DatabaseCommand extends CommandRunner {
    constructor(
        private readonly winstonService: WinstonService,
    ) {
        super()
    }

    async run(): Promise<void> {
        this.winstonService.log(
            WinstonLog.CommandError,
            {
                message: "Please specify a subcommand, e.g. backup or restore"
            }
        )
    }
}
