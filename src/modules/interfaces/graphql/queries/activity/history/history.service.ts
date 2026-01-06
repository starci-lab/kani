import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    HistorySchema,
    PositionSchema,
    HistorySerieSchema,
    HISTORY_SERIE_COUNT,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    HistoryChartSerie,
    HistoryRequest,
    HistoryRequestFilters,
    HistoryResponseData,
} from "./history.dto"
import { UserJwtLike } from "@modules/passport"
import { DayjsService, MsService } from "@modules/mixin"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
} from "@exceptions"
import { ChartInterval, chartIntervalToMsString } from "../../../abstracts"

/**
 * HistoryService
 *
 * Responsible for maintaining and serving historical equity snapshots
 * for a trading bot.
 *
 * Responsibilities:
 * - Persist a capped, append-only history of CLOSED position snapshots
 * - Incrementally update history from source-of-truth positions
 * - Rebuild history deterministically when missing or corrupted
 * - Generate step-wise chart data over arbitrary time intervals
 *
 * Design principles:
 * - History is derived data and can always be reconstructed
 * - Storage is capped (HISTORY_SERIE_COUNT) to bound memory and query cost
 * - Chart values represent the last known position value at any timestamp
 */
@Injectable()
export class HistoryService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly msService: MsService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Retrieve historical chart data for a bot.
     *
     * Flow:
     * 1. Validate bot existence and ownership
     * 2. Load existing history (if any)
     * 3. Rebuild or incrementally append new history snapshots
     * 4. Persist appended series with automatic trimming
     * 5. Produce chart-ready time series based on requested filters
     *
     * Notes:
     * - History is updated lazily on read
     * - Database writes are idempotent and safe to re-run
     * - Returned data is computed from in-memory merged series
     */
    public async history(
        { botId, filters }: HistoryRequest,
        userLike: UserJwtLike,
    ): Promise<HistoryResponseData> {
        // Load bot and check ownership
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)

        if (!bot) throw new BotNotFoundException("Bot not found")
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException("Bot not owned by user")
        }
        // Retrieve existing history (if any)
        const history = await this.connection
            .model<HistorySchema>(HistorySchema.name)
            .findOne({ bot: botId })
        /**
         * Resolve the full in-memory history series.
         *
         * - If no history exists, rebuild entirely from closed positions
         * - Otherwise, append only newly closed positions
         *
         * `fullSeries` always represents the latest known history state,
         * regardless of whether data was rebuilt or appended.
         */
        let fullSeries: Array<HistorySerieSchema> = []
        let seriesAppended: Array<HistorySerieSchema> = []

        if (!history) {
            const { seriesAppended: _seriesAppended } = await this.rebuildHistorySeries(bot)
            seriesAppended = _seriesAppended
            fullSeries = _seriesAppended
        } else {
            const { seriesAppended: _seriesAppended } = await this.appendHistorySeries(bot, history)
            seriesAppended = _seriesAppended
            fullSeries = [...history.series, ..._seriesAppended]
        }

        /**
         * Persist appended history series.
         *
         * - Appends only new snapshots
         * - Automatically discards oldest entries via $slice
         * - Updates metadata for incremental appends
         *
         * Upsert guarantees history creation if it did not previously exist.
         */
        await this.connection
            .model<HistorySchema>(HistorySchema.name)
            .updateOne(
                { bot: botId },
                {
                    $setOnInsert: {
                        bot: botId
                    },
                    $push: {
                        series: {
                            $each: seriesAppended,
                            $slice: -HISTORY_SERIE_COUNT,
                        },
                    },
                    $inc: {
                        seriesCount: seriesAppended.length,
                    },
                    $set: {
                        lastSeriesUpdatedAt: this.dayjsService.now().toDate(),
                    },
                },
                { upsert: true },
            )
        // Produce chart-ready response
        return this.getHistoryResponseData(fullSeries, filters)
    }

    /**
     * Generate chart-ready history data from stored history snapshots.
     *
     * For each chart time bucket:
     * - Select the most recent history snapshot whose `positionClosedAt`
     *   is less than or equal to the bucket timestamp
     * - Use its `positionValueAtClose` as the chart value
     * - Default to 0 if no snapshot exists yet
     *
     * This produces a step-wise (hold-last-value) chart.
     *
     * Complexity:
     * - O(n * m)
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

        const series: HistoryChartSerie[] = []
        const intervalMs = this.msService.fromString(
            chartIntervalToMsString(interval),
        )

        const fromDate = from
            ? this.dayjsService.from(from).tz(timeZone)
            : this.dayjsService.now().tz(timeZone).subtract(1, "week")

        const toDate = to
            ? this.dayjsService.from(to).tz(timeZone)
            : this.dayjsService.now().tz(timeZone)

        /**
         * Align range boundaries to interval buckets.
         */
        const fromBucketDate = this.dayjsService.getNearestBucketUTC(
            fromDate.toDate(),
            intervalMs,
            timeZone,
        )
        const toBucketDate = this.dayjsService.getNearestBucketUTC(
            toDate.toDate(),
            intervalMs,
            timeZone,
        )

        /**
         * Build aligned chart timestamps.
         *
         * Final `toDate` is explicitly included to ensure completeness.
         */
        const timestamps: Array<number> = []
        for (
            let date = fromBucketDate;
            date.isSameOrBefore(toBucketDate);
            date = date.add(intervalMs, "millisecond")
        ) {
            timestamps.push(date.valueOf())
        }
        timestamps.push(toDate.valueOf())
        for (const timestamp of timestamps) {
            /**
             * Find the latest history snapshot closed at or before this timestamp.
             */
            const maxPositionBeforeTimestamp = this.findLatestSerie(fullSeries, timestamp)
            series.push({
                timestamp: new Date(timestamp),
                value: maxPositionBeforeTimestamp
                    ? maxPositionBeforeTimestamp.positionValueAtClose
                    : 0,
            })
        }

        return {
            series,
            count: series.length,
        }
    }

    /**
     * Fully rebuild history series from source-of-truth positions.
     *
     * - Uses only CLOSED positions (isActive = false)
     * - Fetches most recent positions ordered by close time
     * - Produces a capped, chronological history series
     *
     * Heavy operation:
     * Intended for initial bootstrap, backfill, or recovery.
     * Deterministic and safe to re-run.
     */
    private async rebuildHistorySeries(
        bot: BotSchema,
    ): Promise<HistorySeriesResponse> {
        const positions = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({
                bot: bot.id,
                isActive: false,
            })
            .limit(HISTORY_SERIE_COUNT)
        const series: Array<HistorySerieSchema> = []

        for (const position of positions) {
            const { positionClosedAt, positionValueAtClose } = position
            if (!positionClosedAt || !positionValueAtClose) continue

            series.push({
                positionClosedAt,
                positionValueAtClose,
            })
        }

        return {
            seriesAppended: series,
            discardCount: 0,
        }
    }

    /**
     * Incrementally append new history snapshots.
     *
     * - Fetches CLOSED positions newer than lastSeriesUpdatedAt
     * - Produces only delta history points
     * - Does not mutate existing history
     */
    private async appendHistorySeries(
        bot: BotSchema,
        history: HistorySchema,
    ): Promise<HistorySeriesResponse> {
        const { lastSeriesUpdatedAt, seriesCount } = history

        const positions = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({
                bot: bot.id,
                isActive: false,
                positionClosedAt: { $gt: lastSeriesUpdatedAt },
            })
            .limit(HISTORY_SERIE_COUNT)

        const seriesAppended: Array<HistorySerieSchema> = []

        for (const position of positions) {
            const { positionClosedAt, positionValueAtClose } = position
            if (!positionClosedAt || !positionValueAtClose) continue

            seriesAppended.push({
                positionClosedAt,
                positionValueAtClose,
            })
        }

        const overflow =
            seriesCount + seriesAppended.length - HISTORY_SERIE_COUNT

        return {
            seriesAppended,
            discardCount: Math.max(overflow, 0),
        }
    }

    private findLatestSerie(
        series: Array<HistorySerieSchema>,
        timestamp: number,
    ): HistorySerieSchema | null {
        let left = 0
        let right = series.length - 1
        let result: HistorySerieSchema | null = null

        while (left <= right) {
            const mid = Math.floor((left + right) / 2)
            const midTime = new Date(series[mid].positionClosedAt).getTime()
    
            if (midTime <= timestamp) {
                result = series[mid]
                left = mid + 1
            } else {
                right = mid - 1
            }
        }

        return result
    }
}

export interface HistorySeriesResponse {
    seriesAppended: Array<HistorySerieSchema>
    discardCount: number
}
