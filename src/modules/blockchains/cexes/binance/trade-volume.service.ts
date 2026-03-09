import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    BINANCE_TRADE_VOLUME_STREAM_NAME,
    BINANCE_WS_URL,
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
    BinanceTokenRegistryService,
} from "./token-registry.service"
import type {
    BinanceTradeStream,
    BinanceTradeStreamAck,
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

/**
 * Service for handling Binance trade volume (volume per fill).
 * Subscribes to the @trade stream; each message is one filled trade.
 * Writes quote volume (qty * price, e.g. USDT) per trade to InfluxDB.
 *
 * @example
 * Service subscribes to trade stream on bootstrap and writes volume to InfluxDB.
 */
@Injectable()
export class BinanceTradeVolumeService implements OnApplicationBootstrap {
    constructor(
        private readonly retryService: RetryService,
        private readonly binanceTokenRegistryService: BinanceTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly primaryInfluxdbVolumeBucketService: PrimaryInfluxdbVolumeBucketService,
    ) {}

    /**
     * Subscribes to Binance trade stream per batch and writes quote volume per fill to InfluxDB.
     *
     * @returns void
     */
    onApplicationBootstrap(): void {
        // get ticker symbols and convert to trade stream params
        const tickerSymbols = this.binanceTokenRegistryService.getBinanceSymbols()
        const tradeStreamParams = tickerSymbols.map((s) =>
            s.replace("@ticker",
                "@trade"),
        )
        // split into batches from config
        const batches = _.chunk(
            tradeStreamParams,
            envConfig().cexes.binance.chunks.lastPrice,
        )

        for (const batch of batches) {
            this.retryService.retry({
                options: {
                    retries: Infinity,
                },
                action: async () => {
                    const connection = new WebSocketStreamConnection(
                        BINANCE_WS_URL,
                    )
                    const abortController = new AbortController()
                    let timeout: NodeJS.Timeout | undefined = undefined
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
                    const stream =
                        await this.streamAsyncIteratorService.createStream({
                            connection,
                            signal: abortController.signal,
                            onOpen: (conn: WebSocketStreamConnection) => {
                                this.winstonService.log(
                                    WinstonLog.WebsocketSubscriptionOpened,
                                    {
                                        streamName:
                                            BINANCE_TRADE_VOLUME_STREAM_NAME,
                                        symbols: batch,
                                    },
                                )
                                startTime = this.dayjsService.now()
                                conn.ws.send(
                                    JSON.stringify({
                                        method: "SUBSCRIBE",
                                        params: batch,
                                        id: 1,
                                    }),
                                )
                            },
                            onError: (error: Error) => {
                                this.winstonService.log(
                                    WinstonLog.WebsocketSubscriptionError,
                                    {
                                        error: error.message,
                                        streamName:
                                            BINANCE_TRADE_VOLUME_STREAM_NAME,
                                        symbols: batch,
                                    },
                                )
                            },
                            onClose: () => {
                                this.winstonService.log(
                                    WinstonLog.WebsocketSubscriptionClosed,
                                    {
                                        streamName:
                                            BINANCE_TRADE_VOLUME_STREAM_NAME,
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
                            // parse trade or ack message
                            const parsed = JSON.parse(
                                data.toString(),
                            ) as BinanceTradeStream | BinanceTradeStreamAck

                            if ("result" in parsed && parsed.result === null) {
                                continue
                            }
                            if (!("data" in parsed)) continue

                            const trade = parsed.data
                            const symbol = trade.s
                            const price = parseFloat(trade.p)
                            const quoteVolume = parseFloat(trade.q)
                            // map symbol to token ids and write volume per token
                            const tokenPrices =
                                this.binanceTokenRegistryService.getBinanceTokenPrices(
                                    {
                                        tokenPriceDataArray: [
                                            {
                                                symbol, price 
                                            },
                                        ],
                                    },
                                )
                            resetTimeout()

                            await this.asyncService.allIgnoreError(
                                tokenPrices.map(async (tokenPrice) => {
                                    await this.primaryInfluxdbVolumeBucketService.write(
                                        {
                                            id: tokenPrice.id,
                                            volume: new Decimal(quoteVolume),
                                            cexId: CexId.Binance,
                                        },
                                    )
                                }),
                            )
                        } catch (error) {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: (error as Error).message,
                                    streamName:
                                        BINANCE_TRADE_VOLUME_STREAM_NAME,
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
