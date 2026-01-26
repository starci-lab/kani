import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    HistorySchema,
    PositionSchema,
    HistorySerieSchema,
    UserSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    HistoryV2ChartSerie,
    HistoryV2Request,
    HistoryV2RequestFilters,
    HistoryV2ResponseData,
} from "./history-v2.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    DayjsService 
} from "@modules/mixin"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    UserNotFoundException,
} from "@modules/exceptions"
import {
    ChartInterval, chartIntervalToMsString 
} from "../../../abstracts"
import {
    envConfig 
} from "@modules/env"
import ms from "ms"

@Injectable()
export class HistoryV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) {}

    public async historyV2(
        { botId, filters }: HistoryV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<HistoryV2ResponseData> {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id 
            })
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }
        // Validate bot
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)

        if (!bot) throw new BotNotFoundException({
            id: botId,
        })
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: user.id,
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
                            $slice: -envConfig().history.serieCount,
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

    private async getHistoryResponseData(
        fullSeries: Array<HistorySerieSchema>,
        filters: HistoryV2RequestFilters,
    ): Promise<HistoryV2ResponseData> {
        const {
            interval = ChartInterval.OneHour,
            from,
            to,
            timeZone = "UTC",
        } = filters

        const intervalMs = ms(
            chartIntervalToMsString(interval),
        )

        const fromDate = from
            ? this.dayjsService.from(from).tz(timeZone)
            : this.dayjsService.now().tz(timeZone).subtract(1,
                "week")

        const toDate = to
            ? this.dayjsService.from(to).tz(timeZone)
            : this.dayjsService.now().tz(timeZone)

        const fromBucketDate = this.dayjsService.getBucketStartUtcByTimezone(
            fromDate.toDate(),
            intervalMs,
            timeZone,
        )
        const toBucketDate = this.dayjsService.getBucketStartUtcByTimezone(
            toDate.toDate(),
            intervalMs,
            timeZone,
        )

        // Build timestamps (ASC)
        const timestamps: Array<number> = []
        for (
            let date = fromBucketDate;
            date.isSameOrBefore(toBucketDate);
            date = date.add(intervalMs,
                "millisecond")
        ) {
            timestamps.push(date.valueOf())
        }
        timestamps.push(toDate.valueOf())

        // Two-pointer scan
        const series: Array<HistoryV2ChartSerie> = []
        let serieIndex = 0
        let lastSerie: HistorySerieSchema | null = null

        for (const timestamp of timestamps) {
            while (
                serieIndex < fullSeries.length &&
                new Date(fullSeries[serieIndex].positionClosedAt).getTime() <=
                    timestamp
            ) {
                lastSerie = fullSeries[serieIndex]
                serieIndex++
            }
            series.push(
                {
                    timestamp: new Date(timestamp),
                    value: lastSerie ? lastSerie.positionValueAtClose : 0,
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
            })
            .sort({
                positionClosedAt: 1 
            }) // ASC
            .limit(envConfig().history.serieCount)

        const series: Array<HistorySerieSchema> = []

        for (const position of positions) {
            if (!position.closeSnapshot)
                continue

            series.push({
                positionClosedAt: position.closeSnapshot.snapshotAt,
                positionValueAtClose: position.closeSnapshot.positionValue,
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
                positionClosedAt: {
                    $gt: history.lastSeriesUpdatedAt 
                },
            })
            .sort({
                positionClosedAt: 1 
            }) // ASC
            .limit(envConfig().history.serieCount)

        const seriesAppended: Array<HistorySerieSchema> = []

        for (const position of positions) {
            if (!position.closeSnapshot)
                continue

            seriesAppended.push({
                positionClosedAt: position.closeSnapshot.snapshotAt,
                positionValueAtClose: position.closeSnapshot.positionValue,
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

