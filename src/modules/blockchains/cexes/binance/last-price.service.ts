import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    BINANCE_LAST_PRICE_STREAM_NAME,
    BINANCE_WS_URL 
} from "./constants"
import {
    MarketListingId 
} from "@modules/databases"
import {
    AggregatedTokenPriceCacheService 
} from "@modules/cache"
import {
    envConfig 
} from "@modules/env"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    BinanceTokenRegistryService 
} from "./token-registry.service"
import _ from "lodash"
import {
    AsyncService, DayjsService, RetryService 
} from "@modules/mixin"
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
    ) {
    }

    /**
     * Initializes WebSocket subscriptions for Binance token prices on application bootstrap.
     * Splits symbols into batches and creates retryable connections for each batch.
     */
    onApplicationBootstrap(): void {
        // get all Binance symbols
        const symbols = this.binanceTokenRegistryService.getBinanceSymbols()
        
        // split symbols into batches based on configuration
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
                                    durationMs: this.dayjsService.now().diff(
                                        startTime,
                                        "millisecond"
                                    ),
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
                            const tokenPrices = this.binanceTokenRegistryService.getBinanceTokenPrices({
                                tokenPriceDataArray: [
                                    {
                                        price: parseFloat(parsed.data.c),
                                        symbol: streamSymbol,
                                    }
                                ]
                            })
                            
                            // reset timeout to keep connection alive
                            resetTimeout()
                            
                            // update token prices in cache and emit events
                            await this.asyncService.allIgnoreError(
                                tokenPrices.map(
                                    async (tokenPrice) => {
                                        await this.asyncService.allIgnoreError([
                                            // update cache
                                            this.aggregatedTokenPriceCacheService.set({
                                                id: tokenPrice.id,
                                                price: tokenPrice.price,
                                                marketListingId: MarketListingId.Binance,
                                            }),
                                            // emit price update event
                                            this.eventEmitterService.emit({
                                                event: EventName.TokenPriceUpdated,
                                                payload: {
                                                    id: tokenPrice.id,
                                                    price: new Decimal(tokenPrice.price),
                                                    marketListingId: MarketListingId.Binance,
                                                },
                                            }),
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

/**
 * Represents a 24-hour ticker event from Binance WebSocket stream.
 */
interface Ticker24hrEvent {
    /** Event type, e.g., "24hrTicker". */
    e: string
    /** Event time (timestamp). */
    E: number
    /** Symbol, e.g., "SUIUSDT". */
    s: string
    /** Price change. */
    p: string
    /** Price change percent. */
    P: string
    /** Weighted average price. */
    w: string
    /** Previous day's close price. */
    x: string
    /** Current close price. */
    c: string
    /** Close trade quantity. */
    Q: string
    /** Best bid price. */
    b: string
    /** Best bid quantity. */
    B: string
    /** Best ask price. */
    a: string
    /** Best ask quantity. */
    A: string
    /** Open price. */
    o: string
    /** High price. */
    h: string
    /** Low price. */
    l: string
    /** Total traded base asset volume. */
    v: string
    /** Total traded quote asset volume. */
    q: string
    /** Statistics open time. */
    O: number
    /** Statistics close time. */
    C: number
    /** First trade ID. */
    F: number
    /** Last trade ID. */
    L: number
    /** Total number of trades. */
    n: number
}

/**
 * Represents a ticker stream message from Binance WebSocket.
 */
interface Ticker24hrStream {
    /** Stream name, e.g., "suiusdt@ticker". */
    stream: string
    /** Detailed ticker data. */
    data: Ticker24hrEvent
}

/**
 * Represents a null response from Binance WebSocket (subscription acknowledgment).
 */
interface NullTicker24hrStream {
    /** Null result indicating subscription acknowledgment. */
    result: null
    /** Request ID. */
    id: number
}