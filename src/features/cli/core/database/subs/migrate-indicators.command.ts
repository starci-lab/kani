import {
    CommandRunner,
    SubCommand,
} from "nest-commander"
import {
    InjectPrimaryMongoose,
    BotSchema,
    BotViolateIndicatorSchema,
} from "@modules/databases"
import {
    BotViolateIndicatorType,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"

@SubCommand({
    name: "migrate-indicators",
    description: "Set 4 violate indicators for each bot",
})
export class MigrateIndicatorsCommand extends CommandRunner {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) {
        super()
    }

    async run(): Promise<void> {
        const violateIndicators: Array<Partial<BotViolateIndicatorSchema>> = [
            {
                name: "PricePct: Threshold Value 1%: TimeWindow 30s",
                type: BotViolateIndicatorType.PricePct,
                threshold: {
                    triggerPct: 0.01, // trigger violation when average price drops 1% within 30s
                    emergencyExitPct: 0.02, // if price drops 2% or more within 30s, exit all assets to target/USDC and stop the bot
                    reentryPct: 0.005 // if price drop recovers to below 0.5%, bot is allowed to re-enter positions
                },
                metadata: {
                    timeWindowMs: 30000, // 30s
                },
            },
            {
                name: "PricePct: Threshold Value 0.5%: TimeWindow 10s",
                type: BotViolateIndicatorType.PricePct,
                threshold: {
                    trigger: {
                        value: 0.005, // trigger violation when average price drops 0.5% within 10s
                    },
                    emergencyExit: {
                        value: 0.01, // if price drops 1% or more within 10s, exit all assets to target/USDC and stop the bot
                    },
                    reentry: {
                        value: 0.0025, // if price drop recovers to below 0.25%, bot is allowed to re-enter positions
                    },
                },
                metadata: {
                    timeWindowMs: 10000, // 10s
                },
            },
            {
                name: "PriceRegression: Threshold Value 0.3%: R2 Threshold 0.9: TimeWindow 10s",
                type: BotViolateIndicatorType.PriceRegression,
                threshold: {
                    triggerPct: 0.003, // trigger violation when average price drops 0.3% within 10s
                    emergencyExitPct: 0.006, // if price drops 0.6% or more within 10s, exit all assets to target/USDC and stop the bot
                    reentryPct: 0.0015, // if price drop recovers to below 0.15%, bot is allowed to re-enter positions
                },
                metadata: {
                    timeWindowMs: 10000, // 10s
                    r2Threshold: 0.9, // r2 threshold is 0.9
                },
            },
            {
                name: "PriceRegression: Threshold Value 0.6%: R2 Threshold 0.9: TimeWindow 30s",
                type: BotViolateIndicatorType.PriceRegression,
                threshold: {
                    value: 0.006, // mean lose 0.6% in 30s
                    r2Threshold: 0.9, // r2 threshold is 0.9
                },
                metadata: {
                    timeWindowMs: 30000, // 30s
                },
            },
        ] as const
        try {
            this.winstonService.log(WinstonLog.MigrationStarted,
                {
                })
            const bots = await this.connection.model<BotSchema>(BotSchema.name).find({
            }).lean()
            let updatedCount = 0
            for (const bot of bots) {
                await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                    {
                        _id: bot._id,
                    },
                    {
                        $set: {
                            violateIndicators: violateIndicators,
                        },
                    },
                )
                updatedCount++
            }
            this.winstonService.log(
                WinstonLog.MigrationIndicatorsCompleted, 
                {
                    updatedCount,
                }
            )
            process.exit(0)
        } catch (error) {
            this.winstonService.log(WinstonLog.MigrationIndicatorsFailed,
                {
                    error: (error as Error).message,
                })
            process.exit(1)
        }
    }
}
