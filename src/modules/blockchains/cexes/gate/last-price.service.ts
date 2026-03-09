import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    GATE_LAST_PRICE_STREAM_NAME,
    GATE_WS_URL 
} from "./constants"
import {
    CexId,
    MarketListingId,
    PrimaryInfluxdbPriceBucketService
} from "@modules/databases"
import {
    AggregatedTokenPriceCacheService 
} from "@modules/cache"
import {
    AsyncService, DayjsService, RetryService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    GateTokenRegistryService 
} from "./token-registry.service"
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
import _ from "lodash"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./gate.module-definition"
import type {
    GateTickerUpdate 
} from "./types"

/**
 * Subscribes to Gate.io spot ticker stream and writes last prices to cache, InfluxDB, and events.
 * @returns void
 */
@Injectable()
export class GateLastPriceService implements OnApplicationBootstrap {
    constructor(
        private readonly dayjsService: DayjsService,
        private readonly retryService: RetryService,
        private readonly gateTokenRegistryService: GateTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
        private readonly asyncService: AsyncService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) { }

    /**
     * Bootstraps last-price stream: chunks symbols, opens WS, subscribes to tickers, processes updates.
     * @returns void
     */
    onApplicationBootstrap() {
        const symbols = this.gateTokenRegistryService.getSymbols()
        const batches = _.chunk(
            symbols,
            envConfig().cexes.gate.chunks.lastPrice)
        for (const batch of batches) {
            this.retryService.retry(
                {
                    options: {
                        retries: Infinity
                    },
                    action: async () => {
                        const connection = new WebSocketStreamConnection(GATE_WS_URL)
                        const abortController = new AbortController()
                        let timeout: NodeJS.Timeout | undefined = undefined
                        const resetTimeout = () => {
                            if (timeout) {
                                clearTimeout(timeout)
                            }
                            timeout = setTimeout(
                                () => abortController.abort(),
                                envConfig().cexes.gate.ws.idleTimeout,
                            )
                        }
                        let startTime: Dayjs | null = null
                        const stream = await this.streamAsyncIteratorService.createStream({
                            connection,
                            signal: abortController.signal,
                            onOpen: (connection: WebSocketStreamConnection) => {
                                this.winstonService.log(
                                    WinstonLog.WebsocketSubscriptionOpened,
                                    {
                                        streamName: GATE_LAST_PRICE_STREAM_NAME,
                                        symbols: batch,
                                    }
                                )
                                startTime = this.dayjsService.now()
                                resetTimeout()
                                connection.ws.send(
                                    JSON.stringify(
                                        {
                                            channel: "spot.tickers",
                                            event: "subscribe",
                                            time: this.dayjsService.now().unix(),
                                            payload: symbols,
                                        }
                                    )
                                )
                            },
                            onError: (error: Error) => {
                                this.winstonService.log(
                                    WinstonLog.WebsocketSubscriptionError,
                                    {
                                        error: error.message,
                                        streamName: GATE_LAST_PRICE_STREAM_NAME,
                                        symbols,
                                    }
                                )
                            },
                            onClose: () => {
                                this.winstonService.log(
                                    WinstonLog.WebsocketSubscriptionClosed,
                                    {
                                        streamName: GATE_LAST_PRICE_STREAM_NAME,
                                        symbols,
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

                        try {
                            for await (const data of stream) {
                                try {
                                    const parsed = JSON.parse(data.toString()) as GateTickerUpdate
                                    const tokenPrices = this.gateTokenRegistryService.resolveTokenPrices({
                                        tokenPriceDataArray: [
                                            {
                                                symbol: parsed.result.currency_pair,
                                                price: parseFloat(parsed.result.last),
                                            }
                                        ]
                                    })
                                    if (!tokenPrices.length) {
                                        continue
                                    }
                                    resetTimeout()
                                    await this.asyncService.allIgnoreError(
                                        tokenPrices.map(
                                            async (tokenPrice) => {
                                                return this.asyncService.allIgnoreError(
                                                    [
                                                        this.aggregatedTokenPriceCacheService.set({
                                                            id: tokenPrice.id,
                                                            price: tokenPrice.price,
                                                            marketListingId: MarketListingId.Gate,
                                                        }),
                                                        this.primaryInfluxdbPriceBucketService.write(
                                                            {
                                                                id: tokenPrice.id,
                                                                price: new Decimal(tokenPrice.price),
                                                                cexId: CexId.Gate,
                                                            }
                                                        ),
                                                        this.eventEmitterService.emit(
                                                            {
                                                                event: EventName.TokenPriceUpdated,
                                                                payload: {
                                                                    id: tokenPrice.id,
                                                                    price: new Decimal(tokenPrice.price),
                                                                    marketListingId: MarketListingId.Gate,
                                                                },
                                                                options: {
                                                                    useKafka: this.options.useKafka,
                                                                    useLocal: this.options.useLocal,
                                                                }
                                                            }
                                                        ),
                                                    ]
                                                )
                                            })
                                    )
                                } catch (error) {
                                    this.winstonService.log(
                                        WinstonLog.WebsocketSubscriptionError,
                                        {
                                            error: error.message,
                                            streamName: "gate-last-price",
                                            symbols,
                                        })
                                }
                            }
                        } finally {
                            if (timeout) {
                                clearTimeout(timeout)
                            }
                        }
                    }
                })
        }
    }
}