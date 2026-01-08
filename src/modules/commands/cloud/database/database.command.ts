
import { Command, CommandRunner } from "nest-commander"
import { BackupCommand, RestoreCommand, SeedCommand } from "./subs"
import { Logger } from "@nestjs/common"

@Command({
    name: "db",
    description: "manage db actions",
    subCommands: [ BackupCommand, RestoreCommand, SeedCommand ]
})
export class DatabaseCommand extends CommandRunner {
    private readonly logger = new Logger(DatabaseCommand.name)
    constructor(
    ) {
        super()
    }

    async run(): Promise<void> {
        this.logger.error("Please specify a subcommand, e.g. backup or restore")
    }
}
