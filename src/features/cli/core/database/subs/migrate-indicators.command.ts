import {
    CommandRunner,
    SubCommand,
} from "nest-commander"
import {
    InjectPrimaryMongoose,
    BotSchema,
    BotViolateIndicatorSchema,
    BotViolateIndicatorType,
    IndicatorName,
    LogicalOperator,
    Operation,
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
                name: "Price Pct 30s - Violate 1%",
                type: BotViolateIndicatorType.PricePct,
                triggerThresholds: {
                    indicators: [
                        {
                            name: IndicatorName.Pct, op: Operation.Gte, value: 0.01 
                        },
                    ],
                    operation: LogicalOperator.And,
                },
                reentryThresholds: {
                    indicators: [
                        {
                            name: IndicatorName.Pct, op: Operation.Lt, value: 0.005 
                        },
                    ],
                    operation: LogicalOperator.And,
                },
                timeWindowMs: 30000,
            },
            {
                name: "Price Pct 10s - Violate 0.5%",
                type: BotViolateIndicatorType.PricePct,
                triggerThresholds: {
                    indicators: [
                        {
                            name: IndicatorName.Pct, op: Operation.Gte, value: 0.005 
                        },
                    ],
                    operation: LogicalOperator.And,
                },
                reentryThresholds: {
                    indicators: [
                        {
                            name: IndicatorName.Pct, op: Operation.Lt, value: 0.0025 
                        },
                    ],
                    operation: LogicalOperator.And,
                },
                timeWindowMs: 10000,
            },
            {
                name: "Price Regression 10s - Violate 0.3% and R2 0.64",
                type: BotViolateIndicatorType.PriceRegression,
                triggerThresholds: {
                    indicators: [
                        {
                            name: IndicatorName.Pct, op: Operation.Gte, value: 0.003 
                        },
                        {
                            name: IndicatorName.R2, op: Operation.Gte, value: 0.64 
                        },
                    ],
                    operation: LogicalOperator.And,
                },
                reentryThresholds: {
                    indicators: [
                        {
                            name: IndicatorName.Pct, op: Operation.Lt, value: 0.0015 
                        },
                        {
                            name: IndicatorName.R2, op: Operation.Lt, value: 0.64 
                        },
                    ],
                    operation: LogicalOperator.Or,
                },
                timeWindowMs: 10000,
            },
            {
                name: "Price Regression 30s - Violate 0.6% and R2 0.64",
                type: BotViolateIndicatorType.PriceRegression,
                triggerThresholds: {
                    indicators: [
                        {
                            name: IndicatorName.Pct, op: Operation.Gte, value: 0.006 
                        },
                        {
                            name: IndicatorName.R2, op: Operation.Gte, value: 0.64 
                        },
                    ],
                    operation: LogicalOperator.And,
                },
                reentryThresholds: {
                    indicators: [
                        {
                            name: IndicatorName.Pct, op: Operation.Lt, value: 0.003 
                        },
                        {
                            name: IndicatorName.R2, op: Operation.Lt, value: 0.64 
                        },
                    ],
                    operation: LogicalOperator.Or,
                },
                timeWindowMs: 30000,
            },
        ]
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
