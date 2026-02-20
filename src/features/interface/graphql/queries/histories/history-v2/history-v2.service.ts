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
    ChartInterval,
    chartIntervalToMsString,
    ChartUnit,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    HistoryV2ChartSerie,
    HistoryV2Request,
    HistoryV2RequestFilters,
    HistoryV2ResponseData,
} from "./graphql-types"
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

    /**
     * Get the history v2 response data.
     *
     * @param param - Parameters for getting history v2 response data
     * @param param.botId - Bot ID
     * @param param.filters - Filters
     * @param param.response - Response
     * @returns History v2 response data
     */
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
            }
            )

        let fullSeries: Array<HistorySerieSchema> = []
        let seriesAppended: Array<HistorySerieSchema> = []

        if (!history) {
            const result = await this.rebuildHistorySeries(bot)
            seriesAppended = result.seriesAppended
            fullSeries = seriesAppended
        } else {
            const result = await this.appendHistorySeries(
                bot,
                history
            )
            seriesAppended = result.seriesAppended
            fullSeries = [
                ...history.series,
                ...seriesAppended
            ]
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

        return this.getHistoryResponseData({
            fullSeries,
            filters,
            botId,
        })
    }

    /**
     * Get the history response data.
     *
     * @param param - Parameters for getting history response data
     * @param param.fullSeries - Full series
     * @param param.filters - Filters
     * @param param.botId - Bot ID
     * @returns History response data
     */
    private async getHistoryResponseData(
        { fullSeries, filters, botId }: GetHistoryResponseDataParams
    ): Promise<HistoryV2ResponseData> {
        const {
            interval = ChartInterval.OneHour,
            from,
            to,
            timeZone = "UTC",
            unit = ChartUnit.Target,
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
        // we get the last position, if it is open
        const lastPosition = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .findOne(
                {
                    bot: botId,
                    isActive: true,
                    openSnapshot: {
                        $exists: true,
                    },
                }
            )
        // Two-pointer scan
        const series: Array<HistoryV2ChartSerie> = []
        let serieIndex = 0
        let lastActivePositionReached = false
        let lastSerie: HistorySerieSchema | null = null

        for (const timestamp of timestamps) {
            // we get the last serie that is before the timestamp
            while (
                // we are not at the last serie
                serieIndex < fullSeries.length &&
                // the serie is before the timestamp
              new Date(fullSeries[serieIndex].snapshotAt).getTime() <= timestamp
            ) {
                lastSerie = fullSeries[serieIndex]
                serieIndex++
            }
          
            // if we are at the last serie and the last position is open, we use the last position
            if (
                // we are at the last serie
                serieIndex === fullSeries.length &&
                // the last position is open
              lastPosition?.openSnapshot &&
              // the last position is before the timestamp
              new Date(lastPosition.openSnapshot.snapshotAt).getTime() <= timestamp
              // we have not reached the last active position
              && !lastActivePositionReached
            ) {
                lastActivePositionReached = true
                lastSerie = {
                    snapshotAt: lastPosition.openSnapshot.snapshotAt,
                    balanceAmount: lastPosition.openSnapshot.balanceValue ?? 0,
                    balanceAmountInUsd: lastPosition.openSnapshot.balanceValueInUsd ?? 0,
                }
            }
            if (!lastSerie) {
                continue
            }
            series.push(
                {
                    timestamp: new Date(timestamp),
                    value:
                unit === ChartUnit.Target
                    ? (lastSerie?.balanceAmount ?? 0)
                    : (lastSerie?.balanceAmountInUsd ?? 0),
                }
            )
        }
        return {
            series,
            count: series.length,
        }
    }

    /**
     * Rebuild the history series.
     *
     * @param bot - Bot
     * @returns History series response
     */
    private async rebuildHistorySeries(
        bot: BotSchema,
    ): Promise<HistorySeriesResponse> {
        const positions = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({
                bot: bot.id,
                isActive: false,
                openSnapshot: {
                    $exists: true,
                },
                closeSnapshot: {
                    $exists: true,
                },
            })
            .sort({
                "closeSnapshot.snapshotAt": 1 
            }) // ASC
            .limit(envConfig().history.serieCount)

        const series: Array<HistorySerieSchema> = []
        // push the first open snapshot
        if (positions.length > 1) {
            console.log(positions[0].openSnapshot)
            if (positions[0]?.openSnapshot) {
                series.push(
                    {
                        snapshotAt: positions[0].openSnapshot.snapshotAt,
                        balanceAmount: positions[0].openSnapshot.balanceValue,
                        balanceAmountInUsd: positions[0].openSnapshot.balanceValueInUsd,
                    }
                )
            }
        }
        // push the close snapshots
        for (const position of positions) {
            if (!position.closeSnapshot)
                continue
            series.push(
                {
                    snapshotAt: position.closeSnapshot.snapshotAt,
                    balanceAmount: position.closeSnapshot.balanceValue,
                    balanceAmountInUsd: position.closeSnapshot.balanceValueInUsd,
                }
            )
        }
        return {
            seriesAppended: series,
            discardCount: 0,
        }
    }

    /**
     * Append the history series.
     *
     * @param bot - Bot
     * @param history - History
     * @returns History series response
     */
    private async appendHistorySeries(
        bot: BotSchema,
        history: HistorySchema,
    ): Promise<HistorySeriesResponse> {
        const positions = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({
                bot: bot.id,
                isActive: false,
                openSnapshot: {
                    $exists: true,
                },
                closeSnapshot: {
                    $exists: true,
                },
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
            seriesAppended.push(
                {
                    snapshotAt: position.closeSnapshot.snapshotAt,
                    balanceAmount: position.closeSnapshot.balanceValue,
                    balanceAmountInUsd: position.closeSnapshot.balanceValueInUsd,
                }
            )
        }

        const overflow =
            history.seriesCount +
            seriesAppended.length -
            envConfig().history.serieCount

        return {
            seriesAppended,
            discardCount: Math.max(
                overflow,
                0
            ),
        }
    }
}

export interface HistorySeriesResponse {
    seriesAppended: Array<HistorySerieSchema>
    discardCount: number
}

export interface GetHistoryResponseDataParams {
    fullSeries: Array<HistorySerieSchema>
    filters: HistoryV2RequestFilters
    botId: string
}