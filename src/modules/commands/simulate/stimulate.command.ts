
import { Command, CommandRunner } from "nest-commander"
import { Logger } from "@nestjs/common"
import { SimulatePositionsCommand } from "./subs"
import { InjectFaker } from "@modules/mixin"
import { Faker } from "@faker-js/faker"

@Command({
    name: "simulate",
    aliases: [ "sim" ],
    description: "manage simulate actions",
    subCommands: [ SimulatePositionsCommand ]
})
export class SimulateCommand extends CommandRunner {
    private readonly logger = new Logger(SimulateCommand.name)
    constructor(
        @InjectFaker() private readonly faker: Faker,
    ) {
        super()
    }

    async run(): Promise<void> {
        this.logger.error("Please specify a subcommand, e.g. simulate-positions")
    }
}
