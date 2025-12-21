import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    HistoryChartSerie,
    HistoryRequest,
    HistoryResponseData,
} from "./history.dto"
import { UserJwtLike } from "@modules/passport"
import { DayjsService } from "@modules/mixin"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    TokenNotFoundException,
    TooManyIntervalsException,
} from "@exceptions"
import { MsService } from "@modules/mixin"
import Decimal from "decimal.js"
import { BN } from "bn.js"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { computeDenomination } from "@utils"
import { chartIntervalToMsString } from "../../../abstracts"
import { envConfig } from "@modules/env"
import { TokenType } from "@typedefs"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"

@Injectable()
export class HistoryService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly msService: MsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
    ) {}

    // Use cached history and append latest closed position if needed
    private async historyWithCache(
        bot: BotSchema,
        response: HistoryResponseData,
    ): Promise<HistoryResponseData> {

        // Get latest closed position
        const lastPosition = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .findOne({
                bot: bot._id,
                isActive: false,
            })
            .sort({ positionClosedAt: -1 })

        if (!lastPosition) {
            return response
        }

        // Skip if already appended
        const lastSerie = response.series.at(-1)
        if (
            lastSerie &&
            this.dayjsService
                .from(lastSerie.timestamp)
                .isSame(lastPosition.positionClosedAt)
        ) {
            return response
        }

        // Resolve tokens
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            token => token.id === bot.targetToken.toString(),
        )
        if (!targetToken) throw new TokenNotFoundException("Target token not found")

        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            token => token.id === bot.quoteToken.toString(),
        )
        if (!quoteToken) throw new TokenNotFoundException("Quote token not found")

        const gasToken = this.primaryMemoryStorageService.tokens.find(
            token => token.type === TokenType.Native && token.chainId === bot.chainId,
        )
        if (!gasToken) throw new TokenNotFoundException("Gas token not found")

        // Append new series point
        response.series.push({
            timestamp: this.dayjsService
                .from(lastPosition.positionClosedAt)
                .toDate(),
            value: {
                targetValue: computeDenomination(
                    new BN(lastPosition.snapshotTargetBalanceAmountAfterClose ?? "0"),
                    targetToken.decimals,
                ).toNumber(),
                quoteValue: computeDenomination(
                    new BN(lastPosition.snapshotQuoteBalanceAmountAfterClose ?? "0"),
                    quoteToken.decimals,
                ).toNumber(),
                gasValue: computeDenomination(
                    new BN(lastPosition.snapshotGasBalanceAmountAfterClose ?? "0"),
                    gasToken.decimals,
                ).toNumber(),
            },
        })

        response.count = response.series.length
        return response
    }

    private async historyWithoutCache(
        request: HistoryRequest,
        bot: BotSchema,
    ): Promise<HistoryResponseData> {

        // Extract request params
        const { filters, botId } = request
        const { interval, from, to } = filters
        let { timeZone } = filters

        // Default timezone
        if (!timeZone) {
            timeZone = "UTC"
        }

        // Convert interval to ms
        const intervalMs = this.msService.fromString(
            chartIntervalToMsString(interval),
        )

        // Resolve date range
        const fromDate = from
            ? this.dayjsService.from(from).tz(timeZone)
            : this.dayjsService.now().tz(timeZone).subtract(1, "month")

        const toDate = to
            ? this.dayjsService.from(to).tz(timeZone)
            : this.dayjsService.now().tz(timeZone)

        // Align to bucket boundaries
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

        // Build timestamps
        const timestamps: number[] = []

        for (
            let date = fromBucketDate;
            date.isSameOrBefore(toBucketDate);
            date = date.add(intervalMs, "millisecond")
        ) {
            timestamps.push(date.valueOf())
        }

        const isEndTimestampMissing = timestamps.at(-1) !== toDate.valueOf()
        if (isEndTimestampMissing) {
            timestamps.push(toDate.valueOf())
        }

        // Prevent too many points
        if (new Decimal(timestamps.length).gt(envConfig().intervalLimits.history)) {
            throw new TooManyIntervalsException(
                `Too many intervals, max is ${envConfig().intervalLimits.history}`,
            )
        }

        // Fetch positions
        const positions = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({
                bot: botId,
                isActive: false,
                positionClosedAt: {
                    $gte: fromBucketDate.utc().toDate(),
                    $lte: toDate.utc().toDate(),
                },
            })
            .sort({ positionClosedAt: 1 })

        // Resolve tokens
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            token => token.id === bot.targetToken.toString(),
        )
        if (!targetToken) throw new TokenNotFoundException("Target token not found")

        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            token => token.id === bot.quoteToken.toString(),
        )
        if (!quoteToken) throw new TokenNotFoundException("Quote token not found")

        const gasToken = this.primaryMemoryStorageService.tokens.find(
            token => token.type === TokenType.Native && token.chainId === bot.chainId,
        )
        if (!gasToken) throw new TokenNotFoundException("Gas token not found")

        // Build series
        const firstPosition = positions.at(0)
        let positionIndex = 0
        const series: HistoryChartSerie[] = []

        for (let i = 0; i < timestamps.length - 1; i++) {
            const timestamp = timestamps[i + 1]

            // Before first position → zero balances
            if (
                new Decimal(
                    this.dayjsService.from(firstPosition?.positionClosedAt).valueOf(),
                ).gt(timestamp)
            ) {
                series.push({
                    timestamp: new Date(timestamp),
                    value: { targetValue: 0, quoteValue: 0, gasValue: 0 },
                })
                continue
            }

            // Scan positions linearly
            for (let j = positionIndex; j < positions.length; j++) {
                const position = positions[j]
                const next = positions[j + 1]

                if (j === positions.length - 1) {
                    series.push({
                        timestamp: new Date(timestamp),
                        value: {
                            targetValue: computeDenomination(
                                new BN(position?.snapshotTargetBalanceAmountAfterClose ?? "0"),
                                targetToken.decimals,
                            ).toNumber(),
                            quoteValue: computeDenomination(
                                new BN(position?.snapshotQuoteBalanceAmountAfterClose ?? "0"),
                                quoteToken.decimals,
                            ).toNumber(),
                            gasValue: computeDenomination(
                                new BN(position?.snapshotGasBalanceAmountAfterClose ?? "0"),
                                gasToken.decimals,
                            ).toNumber(),
                        },
                    })
                    break
                }

                if (
                    position?.positionClosedAt &&
                    next?.positionClosedAt &&
                    this.dayjsService.from(next.positionClosedAt).valueOf() < timestamp
                ) {
                    positionIndex = j + 1
                    continue
                }

                if (
                    position?.positionClosedAt &&
                    this.dayjsService.from(position.positionClosedAt).valueOf() <= timestamp &&
                    next?.positionClosedAt &&
                    this.dayjsService.from(next.positionClosedAt).valueOf() > timestamp
                ) {
                    series.push({
                        timestamp: new Date(timestamp),
                        value: {
                            targetValue: computeDenomination(
                                new BN(position?.snapshotTargetBalanceAmountAfterClose ?? "0"),
                                targetToken.decimals,
                            ).toNumber(),
                            quoteValue: computeDenomination(
                                new BN(position?.snapshotQuoteBalanceAmountAfterClose ?? "0"),
                                quoteToken.decimals,
                            ).toNumber(),
                            gasValue: computeDenomination(
                                new BN(position?.snapshotGasBalanceAmountAfterClose ?? "0"),
                                gasToken.decimals,
                            ).toNumber(),
                        },
                    })
                    break
                }
            }
        }

        // Save cache
        const responseData: HistoryResponseData = {
            count: series.length,
            series,
        }

        const cacheResult: HistoryCacheResult = {
            data: responseData,
            isEndTimestampMissing,
        }

        await this.cacheManager.set(
            createCacheKey(CacheKey.History, request),
            this.superjson.stringify(cacheResult),
            envConfig().cache.ttl.api,
        )

        return responseData
    }

    public async history(
        request: HistoryRequest,
        userLike: UserJwtLike,
    ): Promise<HistoryResponseData> {

        // Load bot and check ownership
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(request.botId)

        if (!bot) throw new BotNotFoundException("Bot not found")
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException("Bot not owned by user")
        }

        const cacheKey = createCacheKey(CacheKey.History, request)
        const cached = await this.cacheManager.get<string>(cacheKey)

        if (cached) {
            const { data, isEndTimestampMissing } =
                this.superjson.parse<HistoryCacheResult>(cached)

            const lastSerie = isEndTimestampMissing
                ? data.series.at(-2)
                : data.series.at(-1)

            if (lastSerie) {
                const intervalMs = this.msService.fromString(
                    chartIntervalToMsString(request.filters.interval),
                )

                const isCacheStale = this.dayjsService
                    .from(lastSerie.timestamp)
                    .isSameOrBefore(
                        this.dayjsService.now().subtract(intervalMs, "millisecond"),
                    )

                if (!isCacheStale) {
                    if (isEndTimestampMissing) {
                        data.series.pop()
                    }
                    return this.historyWithCache(bot, data)
                }
            }
        }

        return this.historyWithoutCache(request, bot)
    }
}

export interface HistoryCacheResult {
    data: HistoryResponseData
    isEndTimestampMissing: boolean
}
