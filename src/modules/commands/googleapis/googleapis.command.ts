
import { Command, CommandRunner } from "nest-commander"
import { BackupCommand, RestoreCommand } from "./subs"
import { Logger } from "@nestjs/common"

@Command({
    name: "googleapis",
    aliases: [ "sim" ],
    description: "manage googleapis actions",
    subCommands: [ BackupCommand, RestoreCommand ]
})
export class GoogleapisCommand extends CommandRunner {
    private readonly logger = new Logger(GoogleapisCommand.name)
    constructor(
    ) {
        super()
    }

    async run(): Promise<void> {
        this.logger.error("Please specify a subcommand, e.g. backup or restore")
    }
}
