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
                name: "PricePct: Threshold Value 1%: TimeWindow 30s",
                type: BotViolateIndicatorType.PricePct,
                triggerThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.01 },
                ],
                emergencyExitThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.02 },
                ],
                reentryThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Lt, value: 0.005 },
                ],
                timeWindowMs: 30000,
            },
            {
                name: "PricePct: Threshold Value 0.5%: TimeWindow 10s",
                type: BotViolateIndicatorType.PricePct,
                triggerThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.005 },
                ],
                emergencyExitThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.01 },
                ],
                reentryThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Lt, value: 0.0025 },
                ],
                timeWindowMs: 10000,
            },
            {
                name: "PriceRegression: Threshold Value 0.3%: R2 Threshold 0.9: TimeWindow 10s",
                type: BotViolateIndicatorType.PriceRegression,
                triggerThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.003 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.9 },
                ],
                emergencyExitThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.006 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.9 },
                ],
                reentryThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Lt, value: 0.0015 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.9 },
                ],
                timeWindowMs: 10000,
            },
            {
                name: "PriceRegression: Threshold Value 0.6%: R2 Threshold 0.9: TimeWindow 30s",
                type: BotViolateIndicatorType.PriceRegression,
                triggerThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.006 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.9 },
                ],
                emergencyExitThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.012 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.9 },
                ],
                reentryThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Lt, value: 0.003 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.9 },
                ],
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
