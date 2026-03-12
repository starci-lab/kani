import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    CexId,
    MarketListingId,
    PrimaryInfluxdbPriceBucketService
} from "@modules/databases"
import {
    AggregatedTokenPriceCacheService,
    CacheKey,
    CacheService
} from "@modules/cache"
import {
    AsyncService,
    DayjsService,
    RetryService
} from "@modules/mixin"
import {
    BYBIT_LAST_PRICE_STREAM_NAME,
    BYBIT_WS_URL
} from "./constants"
import {
    envConfig
} from "@modules/env"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    BybitTokenRegistryService
} from "./token-registry.service"
import _ from "lodash"
import {
    WebSocketStreamConnection, StreamAsyncIteratorService
} from "@modules/stream-async-iterator"
import {
    EventEmitterService, EventName
} from "@modules/event"
import Decimal from "decimal.js"
import {
    Dayjs
} from "dayjs"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE
} from "./bybit.module-definition"
import type {
    BybitTickerUpdate, BybitWsSubscribeResult
} from "./types"

/**
 * Subscribes to Bybit spot ticker stream and writes last prices to cache, InfluxDB, and events.
 * @returns void
 */
@Injectable()
export class BybitLastPriceService implements OnApplicationBootstrap {
    constructor(
        private readonly retryService: RetryService,
        private readonly bybitTokenRegistryService: BybitTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
        private readonly asyncService: AsyncService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly dayjsService: DayjsService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
        private readonly cacheService: CacheService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) { }

    /**
     * Bootstraps last-price stream: chunks symbols, opens WS, subscribes to tickers, processes updates.
     * @returns void
     */
    onApplicationBootstrap() {
        const symbols = this.bybitTokenRegistryService.getPriceSymbols()
        if (!symbols.length) return
        // split symbols into chunks (Bybit limit on subscription args)
        const batches = _.chunk(
            symbols,
            envConfig().cexes.bybit.chunks.lastPrice
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
                        if (timeout) {
                            clearTimeout(timeout)
                        }
                        timeout = setTimeout(
                            () => abortController.abort(),
                            envConfig().cexes.ws.idleTimeout,
                        )
                    }

                    let startTime: Dayjs | null = null
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        signal: abortController.signal,
                        onOpen: (connection: WebSocketStreamConnection) => {
                            this.winstonService.log(WinstonLog.WebsocketSubscriptionOpened,
                                {
                                    streamName: BYBIT_LAST_PRICE_STREAM_NAME,
                                    symbols: batch,
                                })
                            startTime = this.dayjsService.now()
                            resetTimeout()
                            connection.ws.send(JSON.stringify({
                                op: "subscribe",
                                args: batch.map(symbol => `tickers.${symbol}`),
                            }))
                        },
                        onError: (error: Error) => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: BYBIT_LAST_PRICE_STREAM_NAME,
                                    symbols: batch,
                                })
                        },
                        onClose: () => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionClosed,
                                {
                                    streamName: BYBIT_LAST_PRICE_STREAM_NAME,
                                    symbols: batch,
                                    durationMs: startTime
                                        ? this.dayjsService.now().diff(
                                            startTime,
                                            "millisecond"
                                        )
                                        : null,
                                }
                            )
                        }
                    })
                    for await (const data of stream) {
                        try {
                            const parsed = JSON.parse(data.toString()) as BybitTickerUpdate | BybitWsSubscribeResult
                            if ("success" in parsed) {
                                if (!parsed.success) continue
                                continue // subscription ACK
                            }
                            if (!("data" in parsed)) continue

                            const tokenPrices = this.bybitTokenRegistryService.getTokenPrices({
                                tokenPriceDataArray: [
                                    {
                                        symbol: parsed.data.symbol,
                                        price: parseFloat(parsed.data.lastPrice),
                                    }
                                ]
                            })

                            if (!tokenPrices.length) {
                                continue
                            }
                            resetTimeout()
                            await this.asyncService.allIgnoreError(
                                tokenPrices.map((tokenPrice) =>
                                    this.asyncService.allIgnoreError(
                                        [
                                            this.aggregatedTokenPriceCacheService.set({
                                                id: tokenPrice.id,
                                                price: tokenPrice.price,
                                                marketListingId: MarketListingId.Bybit,
                                            }),
                                            this.primaryInfluxdbPriceBucketService.write({
                                                id: tokenPrice.id,
                                                price: new Decimal(tokenPrice.price),
                                                cexId: CexId.Bybit,
                                            }),
                                            this.eventEmitterService.emit(
                                                {
                                                    event: EventName.TokenPriceUpdated,
                                                    payload: {
                                                        id: tokenPrice.id,
                                                        price: new Decimal(tokenPrice.price),
                                                        marketListingId: MarketListingId.Bybit,
                                                    },
                                                    options: {
                                                        useNats: this.options.useNats,
                                                        useLocal: this.options.useLocal,
                                                    }
                                                }
                                            ),
                                            this.cacheService.set(
                                                {
                                                    key: CacheKey.CexTokenPriceUpdated,
                                                    args: [tokenPrice.id,
                                                        CexId.Bybit],
                                                    cacheResult: {
                                                        tokenId: tokenPrice.id,
                                                        snapshotAt: this.dayjsService.now(),
                                                    },
                                                }
                                            ),
                                        ]
                                    )
                                )
                            )
                        } catch (error) {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: "bybit-last-price",
                                    symbols: batch,
                                }
                            )
                        }
                    }
                }
            }
            )
        }
    }
}
