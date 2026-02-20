import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    HistorySchema,
    PositionSchema,
    HistorySerieSchema,
    ChartInterval,
    chartIntervalToMsString,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    HistoryChartSerie,
    HistoryRequest,
    HistoryRequestFilters,
    HistoryResponseData,
} from "./graphql-types"
import {
    UserJwtLike 
} from "@modules/passport"
import {
    DayjsService 
} from "@modules/mixin"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
} from "@modules/exceptions"
import ms from "ms"
import {
    envConfig 
} from "@modules/env"

/**
 * HistoryService
 *
 * Responsible for maintaining and serving historical equity snapshots
 * for a trading bot.
 *
 * Design:
 * - History is derived data (can always be rebuilt)
 * - Storage is capped (HISTORY_SERIE_COUNT)
 * - Chart uses step-wise "last known value" semantics
 */
@Injectable()
export class HistoryService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) {}

    public async history(
        { botId, filters }: HistoryRequest,
        userLike: UserJwtLike,
    ): Promise<HistoryResponseData> {
        // Validate bot
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)

        if (!bot) throw new BotNotFoundException({
            id: botId,
        })
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: userLike.id,
            })
        }

        // Load history
        const history = await this.connection
            .model<HistorySchema>(HistorySchema.name)
            .findOne({
                bot: botId 
            })

        let fullSeries: Array<HistorySerieSchema> = []
        let seriesAppended: Array<HistorySerieSchema> = []

        if (!history) {
            const result = await this.rebuildHistorySeries(bot)
            seriesAppended = result.seriesAppended
            fullSeries = seriesAppended
        } else {
            const result = await this.appendHistorySeries(bot,
                history)
            seriesAppended = result.seriesAppended
            fullSeries = [...history.series,
                ...seriesAppended]
        }

        // Persist history
        await this.connection
            .model<HistorySchema>(HistorySchema.name)
            .updateOne(
                {
                    bot: botId 
                },
                {
                    $setOnInsert: {
                        bot: botId 
                    },
                    $push: {
                        series: {
                            $each: seriesAppended,
                            $slice: - envConfig().history.serieCount,
                        },
                    },
                    $inc: {
                        seriesCount: seriesAppended.length,
                    },
                    $set: {
                        lastSeriesUpdatedAt: this.dayjsService.now().toDate(),
                    },
                },
                {
                    upsert: true 
                },
            )

        return this.getHistoryResponseData(fullSeries,
            filters)
    }

    /**
     * Generate chart-ready data using TWO-POINTER technique.
     *
     * Algorithm:
     * - Both timestamps and history series are sorted ASC
     * - Walk through history once, advancing pointer as timestamps grow
     * - Keep last known position value
     *
     * Complexity:
     * - O(n + m)
     *   n = number of chart buckets
     *   m = number of history snapshots
     */
    private async getHistoryResponseData(
        fullSeries: Array<HistorySerieSchema>,
        filters: HistoryRequestFilters,
    ): Promise<HistoryResponseData> {
        const {
            interval = ChartInterval.OneHour,
            from,
            to,
            timeZone = "UTC",
        } = filters

        const intervalMs = ms(chartIntervalToMsString(interval))

        const fromDate = from
            ? this.dayjsService.from(from).tz(timeZone)
            : this.dayjsService.now().tz(timeZone).subtract(1,
                "week")

        const toDate = to
            ? this.dayjsService.from(to).tz(timeZone)
            : this.dayjsService.now().tz(timeZone)

        const fromAlignedTime = this.dayjsService.alignTimeToIntervalUtc(
            {
                timeZone,
                intervalMs,
                time: fromDate,
            }
        )
        const toAlignedTime = this.dayjsService.alignTimeToIntervalUtc(
            {
                timeZone,
                intervalMs,
                time: toDate,
            }
        )

        // Build timestamps (ASC)
        const timestamps: Array<number> = []
        for (
            let date = fromAlignedTime;
            date.isSameOrBefore(toAlignedTime);
            date = date.add(intervalMs,
                "millisecond")
        ) {
            timestamps.push(date.valueOf())
        }
        timestamps.push(toDate.valueOf())

        // Two-pointer scan
        const series: Array<HistoryChartSerie> = []
        let serieIndex = 0
        let lastSerie: HistorySerieSchema | null = null

        for (const timestamp of timestamps) {
            while (
                serieIndex < fullSeries.length &&
                new Date(fullSeries[serieIndex].snapshotAt).getTime() <=
                    timestamp
            ) {
                lastSerie = fullSeries[serieIndex]
                serieIndex++
            }
            series.push(
                {
                    timestamp: new Date(timestamp),
                    value: lastSerie?.balanceAmount ?? 0,
                }
            )
        }
        return {
            series,
            count: series.length,
        }
    }

    private async rebuildHistorySeries(
        bot: BotSchema,
    ): Promise<HistorySeriesResponse> {
        const positions = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({
                bot: bot.id,
                isActive: false,
                closeSnapshot: {
                    $exists: true,
                },
            })
            .sort({
                "closeSnapshot.snapshotAt": 1 
            }) // ASC
            .limit(envConfig().history.serieCount)

        const series: Array<HistorySerieSchema> = []
        console.log(positions.length)
        for (const position of positions) {
            if (!position.closeSnapshot)
                continue
            series.push({
                snapshotAt: position.closeSnapshot.snapshotAt,
                balanceAmount: position.closeSnapshot.balanceValue,
                balanceAmountInUsd: position.closeSnapshot.balanceValueInUsd,
            })
        }

        return {
            seriesAppended: series,
            discardCount: 0,
        }
    }

    private async appendHistorySeries(
        bot: BotSchema,
        history: HistorySchema,
    ): Promise<HistorySeriesResponse> {
        const positions = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({
                bot: bot.id,
                isActive: false,
                "closeSnapshot.snapshotAt": {
                    $gt: history.lastSeriesUpdatedAt 
                },
            })
            .sort({
                "closeSnapshot.snapshotAt": 1 
            }) // ASC
            .limit(envConfig().history.serieCount)

        const seriesAppended: Array<HistorySerieSchema> = []

        for (const position of positions) {
            if (!position.closeSnapshot)
                continue

            seriesAppended.push({
                snapshotAt: position.closeSnapshot.snapshotAt,
                balanceAmount: position.closeSnapshot.balanceValue,
                balanceAmountInUsd: position.closeSnapshot.balanceValueInUsd,
            })
        }

        const overflow =
            history.seriesCount +
            seriesAppended.length -
            envConfig().history.serieCount

        return {
            seriesAppended,
            discardCount: Math.max(overflow,
                0),
        }
    }
}

export interface HistorySeriesResponse {
    seriesAppended: Array<HistorySerieSchema>
    discardCount: number
}
