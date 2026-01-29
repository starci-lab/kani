import {
    CommandRunner, SubCommand 
} from "nest-commander"

import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    SeedersService 
} from "@modules/databases"

@SubCommand({
    name: "seed",
    description: "seed the database",
})
export class SeedCommand extends CommandRunner {
    constructor(
        private readonly seedersService: SeedersService,
        private readonly winstonService: WinstonService,
    ) {
        super()
    }

    async run(): Promise<void> {
        try {
            await this.seedersService.seed()
            this.winstonService.log(WinstonLog.SeedCompleted,
                {
                })
            // exit the app
            process.exit(0)
        } catch (error) {
            this.winstonService.log(WinstonLog.SeedFailed,
                {
                    error: error.message 
                })
            process.exit(1)
        }
    }
}
