
import { Command, CommandRunner } from "nest-commander"

import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { SeedersService } from "@modules/databases"

@Command({
    name: "seed",
    description: "seed the database",
})
export class SeedCommand extends CommandRunner {
    constructor(
        private readonly seedersService: SeedersService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {
        super()
    }

    async run(): Promise<void> {
        try {
            await this.seedersService.seed()
            this.logger.info(WinstonLog.SeedCompleted)
            // exit the app
            process.exit(0)
        } catch (error) {
            this.logger.error(WinstonLog.SeedFailed, { error: error.message })
            process.exit(1)
        }
    }
}
