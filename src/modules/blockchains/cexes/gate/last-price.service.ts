import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    GATE_LAST_PRICE_STREAM_NAME,
    GATE_WS_URL 
} from "./constants"
import {
    MarketListingId 
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
    ) { }

    onApplicationBootstrap() {
        const symbols = this.gateTokenRegistryService.getSymbols()
        if (!symbols.length) return

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
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        signal: abortController.signal,
                        onOpen: (connection: WebSocketStreamConnection) => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionOpened,
                                {
                                    streamName: GATE_LAST_PRICE_STREAM_NAME,
                                    symbols,
                                })
                            resetTimeout()
                            connection.ws.send(
                                JSON.stringify({
                                    channel: "spot.tickers",
                                    event: "subscribe",
                                    time: this.dayjsService.now().unix(),
                                    payload: symbols,
                                }))
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
                                }
                            )
                        }
                    })

                    try {
                        for await (const data of stream) {
                            try {
                                const parsed = JSON.parse(data.toString()) as GateTickerUpdate
                                const tokenPrices = this.gateTokenRegistryService.resolveTokenPrices([
                                    {
                                        symbol: parsed.result.currency_pair,
                                        price: parseFloat(parsed.result.last),
                                    }
                                ])
                                if (!tokenPrices.length) {
                                    continue
                                }
                                resetTimeout()
                                // update the token prices
                                await this.asyncService.allIgnoreError(
                                    tokenPrices.map(
                                        async (tokenPrice) =>
                                            await this.aggregatedTokenPriceCacheService.set({
                                                tokenId: tokenPrice.tokenId,
                                                price: tokenPrice.price,
                                                marketListingId: MarketListingId.Gate,
                                            })
                                    )
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

export interface GateTickerUpdate {
    time: number;       // current timestamp in seconds
    time_ms: number;    // current timestamp in milliseconds
    channel: "spot.tickers";
    event: "update";
    result: GateTickerResult;
}

export interface GateTickerResult {
    currency_pair: string;      // e.g., "SOL_USDT"
    last: string;               // last price
    lowest_ask: string;         // lowest ask price
    highest_bid: string;        // highest bid price
    change_percentage: string;  // 24h change percentage
    base_volume: string;        // base currency volume
    quote_volume: string;       // quote currency volume
    high_24h: string;           // 24h high price
    low_24h: string;            // 24h low price
}