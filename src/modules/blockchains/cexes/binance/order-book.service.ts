import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    BINANCE_WS_URL 
} from "./constants"
import {
    DayjsService, 
    RetryService 
} from "@modules/mixin"
import {
    OrderBook 
} from "../types"
import {
    envConfig 
} from "@modules/env"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    WebSocketStreamConnection, StreamAsyncIteratorService 
} from "@modules/stream-async-iterator"
import {
    BinanceTokenRegistryService 
} from "./token-registry.service"
import _ from "lodash"
import {
    Dayjs 
} from "dayjs"

const ORDER_BOOK_STREAM_NAME = "binance-order-book"

/**
 * Service responsible for subscribing to Binance WebSocket streams for order book data.
 * Handles connection management, retry logic, and order book updates.
 *
 * @example
 * const service = new BinanceOrderBookService(...)
 * // Service automatically starts on application bootstrap
 */
@Injectable()
export class BinanceOrderBookService implements OnApplicationBootstrap {
    constructor(
        private readonly binanceTokenRegistryService: BinanceTokenRegistryService,
        private readonly retryService: RetryService,
        private readonly winstonService: WinstonService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Initializes WebSocket subscriptions for Binance order book data on application bootstrap.
     * Splits symbols into batches and creates retryable connections for each batch.
     */
    onApplicationBootstrap(): void {
        // get all Binance symbols
        const symbols = this.binanceTokenRegistryService.getBinanceSymbols()
        
        // split symbols into batches based on configuration
        const batches = _.chunk(
            symbols,
            envConfig().cexes.binance.chunks.orderBook
        )
        
        // create WebSocket connection for each batch
        for (const batch of batches) {
            this.retryService.retry({
                options: {
                    retries: Infinity,
                },
                action: async () => {
                    // create WebSocket connection
                    const connection = new WebSocketStreamConnection(BINANCE_WS_URL)
                    
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
                            envConfig().cexes.binance.ws.idleTimeout,
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
                                    streamName: ORDER_BOOK_STREAM_NAME,
                                    symbols,
                                }
                            )
                            startTime = this.dayjsService.now()
                            
                            // subscribe to order book stream
                            connection.ws.send(
                                JSON.stringify({
                                    method: "SUBSCRIBE",
                                    params: symbols,
                                    id: 1,
                                })
                            )
                        },
                        onError: (error: Error) => {
                            // log connection error
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: ORDER_BOOK_STREAM_NAME,
                                    symbols,
                                }
                            )
                        },
                        onClose: () => {
                            // log connection closed
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionClosed,
                                {
                                    streamName: ORDER_BOOK_STREAM_NAME,
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

                    // process incoming stream data
                    for await (const data of stream) {
                        try {
                            // parse incoming message
                            const parsed = JSON.parse(data.toString()) as OrderBookStream | NullOrderBookStream
                            
                            // skip subscription acknowledgment
                            if ("result" in parsed && parsed.result === null) {
                                continue
                            }
                            
                            // skip if data field is missing
                            if (!("data" in parsed)) {
                                continue
                            }
                            
                            // extract symbol from stream name
                            const streamSymbol = parsed.stream.split("@")[0]
                            if (!symbols.includes(streamSymbol)) continue

                            // extract best bid and ask
                            const bestBid = parsed.data.bids[0]
                            const bestAsk = parsed.data.asks[0]
                            if (!bestBid || !bestAsk) continue

                            // build order book structure
                            const orderBook: OrderBook = {
                                bidPrice: parseFloat(bestBid[0]),
                                bidQty: parseFloat(bestBid[1]),
                                askPrice: parseFloat(bestAsk[0]),
                                askQty: parseFloat(bestAsk[1]),
                            }
                            
                            // validate order book data
                            if (
                                !Number.isFinite(orderBook.bidPrice) ||
                                !Number.isFinite(orderBook.bidQty) ||
                                !Number.isFinite(orderBook.askPrice) ||
                                !Number.isFinite(orderBook.askQty)
                            ) {
                                continue
                            }

                            // reset timeout to keep connection alive
                            resetTimeout()
                        } catch (error) {
                            // log processing error
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: ORDER_BOOK_STREAM_NAME,
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
 * Represents an order book event from Binance WebSocket stream.
 */
interface OrderBookEvent {
    /** Symbol, e.g., "SUIUSDT". */
    symbol: string
    /** Last update ID. */
    lastUpdateId: number
    /** Bid orders as [price, quantity] tuples. */
    bids: Array<[string, string]>
    /** Ask orders as [price, quantity] tuples. */
    asks: Array<[string, string]>
}

/**
 * Represents an order book stream message from Binance WebSocket.
 */
interface OrderBookStream {
    /** Stream name, e.g., "suiusdt@depth5@100ms". */
    stream: string
    /** Order book event data. */
    data: OrderBookEvent
}

/**
 * Represents a null response from Binance WebSocket (subscription acknowledgment).
 */
interface NullOrderBookStream {
    /** Null result indicating subscription acknowledgment. */
    result: null
    /** Request ID. */
    id: number
}
