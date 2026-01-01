
import { Command, CommandRunner } from "nest-commander"
import { GenerateCommand } from "./subs"
import { Logger } from "@nestjs/common"

@Command({
    name: "key",
    description: "manage key actions",
    subCommands: [ GenerateCommand ]
})
export class KeyCommand extends CommandRunner {
    private readonly logger = new Logger(KeyCommand.name)
    constructor(
    ) {
        super()
    }

    async run(): Promise<void> {
        this.logger.error("Please specify a subcommand, e.g. generate")
    }
}
