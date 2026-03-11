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
                name: "Price pct - 30s - trigger: pct gte 1%, emergency: pct gte 2%, reentry: pct lt 0.5%",
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
                name: "Price pct - 10s - trigger: pct gte 0.5%, emergency: pct gte 1%, reentry: pct lt 0.25%",
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
                name: "Price regression - 10s - trigger: pct gte 0.3% and R2 gte 0.64, emergency: pct gte 0.6% and R2 gte 0.64, reentry: pct lt 0.15% and R2 lt 0.64",
                type: BotViolateIndicatorType.PriceRegression,
                triggerThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.003 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.64 },
                ],
                emergencyExitThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.006 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.64 },
                ],
                reentryThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Lt, value: 0.0015 },
                    { name: IndicatorName.R2, op: Operation.Lt, value: 0.64 },
                ],
                timeWindowMs: 10000,
            },
            {
                name: "Price regression - 30s - trigger: pct gte 0.6% and R2 gte 0.64, emergency: pct gte 1.2% and R2 gte 0.64, reentry: pct lt 0.3% and R2 lt 0.64",
                type: BotViolateIndicatorType.PriceRegression,
                triggerThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.006 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.64 },
                ],
                emergencyExitThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Gte, value: 0.012 },
                    { name: IndicatorName.R2, op: Operation.Gte, value: 0.64 },
                ],
                reentryThresholds: [
                    { name: IndicatorName.Pct, op: Operation.Lt, value: 0.003 },
                    { name: IndicatorName.R2, op: Operation.Lt, value: 0.64 },
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
