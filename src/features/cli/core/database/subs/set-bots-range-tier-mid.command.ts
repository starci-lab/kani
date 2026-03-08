import {
    CommandRunner,
    SubCommand,
} from "nest-commander"
import {
    InjectPrimaryMongoose,
    BotSchema,
} from "@modules/databases"
import {
    RangeTier,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"

@SubCommand({
    name: "set-bots-range-tier-mid",
    description: "Set rangeTier to mid (midRange) for all bots",
})
export class SetBotsRangeTierMidCommand extends CommandRunner {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) {
        super()
    }

    async run(): Promise<void> {
        try {
            this.winstonService.log(
                WinstonLog.MigrationStarted,
                {
                },
            )

            const result = await this.connection
                .model<BotSchema>(BotSchema.name)
                .updateMany(
                    {
                    },
                    {
                        $set: {
                            rangeTier: RangeTier.Mid,
                        },
                    },
                )

            this.winstonService.log(
                WinstonLog.MigrationBotExecutorCompleted,
                {
                    updatedCount: result.modifiedCount ?? 0,
                },
            )

            process.exit(0)
        } catch (error: unknown) {
            this.winstonService.log(
                WinstonLog.MigrationBotExecutorFailed,
                {
                    error: error instanceof Error ? error.message : String(error),
                },
            )
            process.exit(1)
        }
    }
}
