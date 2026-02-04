import {
    CommandRunner,
    SubCommand,
} from "nest-commander"
import {
    InjectPrimaryMongoose,
    BotSchema,
    ExecutorSchema,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"

@SubCommand({
    name: "migrate-bot-executor",
    description: "Migrate bots: set bot.executor from executor.assignedBots for each executor",
})
export class MigrateBotExecutorCommand extends CommandRunner {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) {
        super()
    }

    async run(): Promise<void> {
        try {
            this.winstonService.log(WinstonLog.MigrationStarted,
                {
                })

            const ExecutorModel = this.connection.model<ExecutorSchema>(
                ExecutorSchema.name
            )
            const BotModel = this.connection.model<BotSchema>(
                BotSchema.name
            )

            const executors = await ExecutorModel.find({}).lean()
            let updatedCount = 0

            for (const executor of executors) {
                const assignedBots = executor.assignedBots ?? []
                for (const assigned of assignedBots) {
                    const botId = assigned?.bot
                    if (!botId) continue
                    const result = await BotModel.updateOne(
                        {
                            _id: botId,
                        },
                        {
                            $set: {
                                executor: executor._id,
                            },
                        },
                    )
                    if (result.modifiedCount > 0) {
                        updatedCount++
                    }
                }
            }

            this.winstonService.log(
                WinstonLog.MigrationBotExecutorCompleted,
                {
                    updatedCount,
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
