import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    BYBIT_TRADE_VOLUME_STREAM_NAME,
    BYBIT_WS_URL,
} from "./constants"
import {
    CexId,
    PrimaryInfluxdbVolumeBucketService,
} from "@modules/databases"
import {
    envConfig,
} from "@modules/env"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    BybitTokenRegistryService,
} from "./token-registry.service"
import type {
    BybitTradeUpdate,
    BybitWsSubscribeResult,
} from "./types"
import _ from "lodash"
import {
    AsyncService,
    DayjsService,
    RetryService,
} from "@modules/mixin"
import {
    WebSocketStreamConnection,
    StreamAsyncIteratorService,
} from "@modules/stream-async-iterator"
import Decimal from "decimal.js"
import {
    Dayjs,
} from "dayjs"
import {
    CacheKey,
    CacheService,
} from "@modules/cache"

/**
 * Service for handling Bybit trade volume (volume per fill).
 * Subscribes to the publicTrade stream; each message may contain multiple trades.
 * Writes quote volume (size * price) per trade to InfluxDB and cache.
 *
 * @example
 * Service subscribes to trade stream on bootstrap and writes volume to InfluxDB.
 */
@Injectable()
export class BybitTradeVolumeService implements OnApplicationBootstrap {
    constructor(
        private readonly retryService: RetryService,
        private readonly bybitTokenRegistryService: BybitTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly primaryInfluxdbVolumeBucketService: PrimaryInfluxdbVolumeBucketService,
        private readonly cacheService: CacheService,
    ) {}

    /**
     * Subscribes to Bybit publicTrade stream per batch and writes quote volume per fill to InfluxDB.
     *
     * @returns void
     */
    onApplicationBootstrap(): void {
        const symbols = this.bybitTokenRegistryService.getVolumeSymbols()
        if (!symbols.length) return
        const batches = _.chunk(
            symbols,
            envConfig().cexes.bybit.chunks.volume,
        )

        for (const batch of batches) {
            this.retryService.retry({
                options: {
                    retries: Infinity,
                },
                action: async () => {
                    const connection = new WebSocketStreamConnection(BYBIT_WS_URL)
                    const abortController = new AbortController()
                    let timeout: NodeJS.Timeout | undefined = undefined
                    const resetTimeout = () => {
                        if (timeout) clearTimeout(timeout)
                        timeout = setTimeout(
                            () => abortController.abort(),
                            envConfig().cexes.ws.idleTimeout,
                        )
                    }

                    let startTime: Dayjs | null = null
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        signal: abortController.signal,
                        onOpen: (conn: WebSocketStreamConnection) => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionOpened,
                                {
                                    streamName: BYBIT_TRADE_VOLUME_STREAM_NAME,
                                    symbols: batch,
                                },
                            )
                            startTime = this.dayjsService.now()
                            resetTimeout()
                            conn.ws.send(JSON.stringify({
                                op: "subscribe",
                                args: batch.map((s) => `publicTrade.${s}`),
                            }))
                        },
                        onError: (error: Error) => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: BYBIT_TRADE_VOLUME_STREAM_NAME,
                                    symbols: batch,
                                },
                            )
                        },
                        onClose: () => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionClosed,
                                {
                                    streamName: BYBIT_TRADE_VOLUME_STREAM_NAME,
                                    symbols: batch,
                                    durationMs: startTime
                                        ? this.dayjsService.now().diff(
                                            startTime,
                                            "millisecond",
                                        )
                                        : null,
                                },
                            )
                        },
                    })

                    for await (const data of stream) {
                        try {
                            const parsed = JSON.parse(data.toString()) as
                                | BybitTradeUpdate
                                | BybitWsSubscribeResult
                            if ("success" in parsed) {
                                if (!parsed.success) continue
                                continue
                            }
                            if (!("data" in parsed) || !Array.isArray(parsed.data)) continue

                            for (const trade of parsed.data) {
                                const symbol = trade.s
                                const tokenVolumes = this.bybitTokenRegistryService.getTokenVolumes({
                                    tokenVolumeDataArray: [
                                        {
                                            symbol,
                                            volume: parseFloat(trade.v),
                                        },
                                    ],
                                })
                                if (!tokenVolumes.length) continue
                                resetTimeout()
                                await this.asyncService.allIgnoreError(
                                    tokenVolumes.map(async (tokenVolume) => {
                                        await this.asyncService.allIgnoreError(
                                            [
                                                this.primaryInfluxdbVolumeBucketService.write({
                                                    id: tokenVolume.id,
                                                    volume: new Decimal(tokenVolume.volume),
                                                    cexId: CexId.Bybit,
                                                }),
                                                this.cacheService.set({
                                                    key: CacheKey.CexTokenVolumeUpdated,
                                                    args: [tokenVolume.id,
                                                        CexId.Bybit],
                                                    cacheResult: {
                                                        tokenId: tokenVolume.id,
                                                        snapshotAt: this.dayjsService.now(),
                                                    },
                                                }),
                                            ]
                                        )
                                    },
                                    ),
                                )
                            }
                        } catch (error) {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: (error as Error).message,
                                    streamName: BYBIT_TRADE_VOLUME_STREAM_NAME,
                                    symbols: batch,
                                },
                            )
                        }
                    }
                },
            })
        }
    }
}
