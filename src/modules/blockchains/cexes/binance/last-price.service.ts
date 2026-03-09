import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    BINANCE_LAST_PRICE_STREAM_NAME,
    BINANCE_WS_URL,
} from "./constants"
import {
    CexId,
    MarketListingId,
    PrimaryInfluxdbPriceBucketService,
} from "@modules/databases"
import {
    AggregatedTokenPriceCacheService,
    CacheKey,
    CacheService,
} from "@modules/cache"
import {
    envConfig,
} from "@modules/env"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    BinanceTokenRegistryService,
} from "./token-registry.service"
import type {
    NullTicker24hrStream,
    Ticker24hrStream,
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
import {
    EventEmitterService,
    EventName,
} from "@modules/event"
import Decimal from "decimal.js"
import {
    Dayjs,
} from "dayjs"
import {
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} from "./binance.module-definition"

/**
 * Service for handling Binance last price data.
 *
 * @example
 * Service subscribes to ticker stream on bootstrap and writes prices to cache and InfluxDB.
 */
@Injectable()
export class BinanceLastPriceService implements OnApplicationBootstrap {
    constructor(
        private readonly retryService: RetryService,
        private readonly binanceTokenRegistryService: BinanceTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
        private readonly cacheService: CacheService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) {
    }

    /**
     * Subscribes to Binance ticker stream per batch and writes last price to cache, events, and InfluxDB.
     *
     * @returns void
     */
    onApplicationBootstrap(): void {
        // get all Binance symbols for ticker stream
        const symbols = this.binanceTokenRegistryService.getBinanceSymbols()
        // split symbols into batches from config
        const batches = _.chunk(
            symbols,
            envConfig().cexes.binance.chunks.lastPrice
        )
        // create WebSocket connection for each batch
        for (const batch of batches) {
            this.retryService.retry({
                options: {
                    retries: Infinity,
                },
                action: async () => {
                    // create WebSocket connection
                    const connection = new WebSocketStreamConnection(
                        BINANCE_WS_URL
                    )

                    // create abort controller for connection management
                    const abortController = new AbortController()

                    // create timeout for connection idle detection
                    let timeout: NodeJS.Timeout | undefined = undefined

                    // reset timeout function to keep connection alive
                    const resetTimeout = () => {
                        if (timeout) {
                            clearTimeout(timeout)
                        }
                        timeout = setTimeout(
                            () => abortController.abort(),
                            envConfig().cexes.binance.interval.rest,
                        )
                    }

                    let startTime: Dayjs | null = null
                    // create WebSocket stream
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        signal: abortController.signal,
                        onOpen: (connection: WebSocketStreamConnection) => {
                            // log connection opened
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionOpened,
                                {
                                    streamName: BINANCE_LAST_PRICE_STREAM_NAME,
                                    symbols: batch,
                                }
                            )
                            startTime = this.dayjsService.now()

                            // subscribe to ticker stream
                            connection.ws.send(
                                JSON.stringify({
                                    method: "SUBSCRIBE",
                                    params: batch,
                                    id: 1,
                                }),
                            )
                        },
                        onError: (error: Error) => {
                            // log connection error
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: BINANCE_LAST_PRICE_STREAM_NAME,
                                    symbols: batch,
                                }
                            )
                        },
                        onClose: () => {
                            // log connection closed
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionClosed,
                                {
                                    streamName: BINANCE_LAST_PRICE_STREAM_NAME,
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

                    // process incoming stream data
                    for await (const data of stream) {
                        try {
                            // parse incoming message
                            const parsed = JSON.parse(
                                data.toString(),
                            ) as Ticker24hrStream | NullTicker24hrStream

                            // skip subscription acknowledgment
                            if ("result" in parsed && parsed.result === null) continue

                            // skip if data field is missing
                            if (!("data" in parsed)) continue

                            // extract symbol from stream name
                            const streamSymbol = parsed.stream.split("@")[0]
                            // get token prices from registry
                            const tokenPrices = this.binanceTokenRegistryService.getBinanceTokenPrices(
                                {
                                    tokenPriceDataArray: [
                                        {
                                            price: parseFloat(parsed.data.c),
                                            symbol: streamSymbol,
                                        }
                                    ]
                                }
                            )
                            // reset timeout to keep connection alive
                            resetTimeout()
                            // update token prices in cache and emit events
                            await this.asyncService.allIgnoreError(
                                tokenPrices.map(
                                    async (tokenPrice) => {
                                        await this.asyncService.allIgnoreError([
                                            // update cache
                                            this.aggregatedTokenPriceCacheService.set(
                                                {
                                                    id: tokenPrice.id,
                                                    price: tokenPrice.price,
                                                    marketListingId: MarketListingId.Binance,
                                                }
                                            ),
                                            // mark to cache that binance token snapshot is updated
                                            this.cacheService.set(
                                                {
                                                    key: CacheKey.CexTokenPriceUpdated,
                                                    args: [tokenPrice.id],
                                                    cacheResult: {
                                                        tokenId: tokenPrice.id,
                                                        snapshotAt: this.dayjsService.now(),
                                                        cexId: CexId.Binance,
                                                    },
                                                }
                                            ),
                                            // emit price update event
                                            this.eventEmitterService.emit({
                                                event: EventName.TokenPriceUpdated,
                                                payload: {
                                                    id: tokenPrice.id,
                                                    price: new Decimal(tokenPrice.price),
                                                    marketListingId: MarketListingId.Binance,
                                                },
                                                options: {
                                                    useKafka: this.options.useKafka,
                                                    useLocal: this.options.useLocal,
                                                }
                                            }),
                                            // update influxdb
                                            this.primaryInfluxdbPriceBucketService.write(
                                                {
                                                    id: tokenPrice.id,
                                                    price: new Decimal(tokenPrice.price),
                                                    cexId: CexId.Binance,
                                                }
                                            )
                                        ])
                                    }
                                )
                            )
                        } catch (error) {
                            // log processing error
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: BINANCE_LAST_PRICE_STREAM_NAME,
                                    symbols: batch,
                                }
                            )
                        }
                    }
                },
            })
        }
    }
}