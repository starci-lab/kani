import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    BINANCE_WS_URL 
} from "./constants"
import {
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

const ORDER_BOOK_STREAM_NAME = "binance-order-book"
@Injectable()
export class BinanceOrderBookService implements OnApplicationBootstrap {
    constructor(
        private readonly binanceTokenRegistryService: BinanceTokenRegistryService,
        private readonly retryService: RetryService,
        private readonly winstonService: WinstonService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
    ) {}

    onApplicationBootstrap() {
        const symbols = this.binanceTokenRegistryService.getBinanceSymbols()
        const batches = _.chunk(
            symbols,
            envConfig().cexes.binance.chunks.orderBook
        )
        for (const batch of batches) {
            this.retryService.retry({
                options: {
                    retries: Infinity,
                },
                action: async () => {
                    const connection = new WebSocketStreamConnection(BINANCE_WS_URL)
                    const abortController = new AbortController()
                    let timeout: NodeJS.Timeout | undefined = undefined

                    const resetTimeout = () => {
                        if (timeout) {
                            clearTimeout(timeout)
                        }
                        timeout = setTimeout(
                            () => abortController.abort(),
                            envConfig().cexes.binance.ws.idleTimeout,
                        )
                    }

                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        signal: abortController.signal,
                        onOpen: (connection: WebSocketStreamConnection) => {
                            this.winstonService.log(WinstonLog.WebsocketSubscriptionOpened,
                                {
                                    streamName: ORDER_BOOK_STREAM_NAME,
                                    symbols,
                                })
                            connection.ws.send(
                                JSON.stringify({
                                    method: "SUBSCRIBE",
                                    params: symbols,
                                    id: 1,
                                }))
                        },
                        onError: (error: Error) => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: ORDER_BOOK_STREAM_NAME,
                                    symbols,
                                })
                        },
                        onClose: () => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionClosed,
                                {
                                    streamName: ORDER_BOOK_STREAM_NAME,
                                    symbols,
                                })
                        }
                    })

                    for await (const data of stream) {
                        try {
                            const parsed = JSON.parse(data.toString()) as OrderBookStream | NullOrderBookStream

                            // Subscription ACK: { result: null, id: 1 }
                            if ("result" in parsed && parsed.result === null) {
                                continue
                            }

                            if (!("data" in parsed)) {
                                continue
                            }

                            const streamSymbol = parsed.stream.split("@")[0]
                            if (!symbols.includes(streamSymbol)) continue

                            const bestBid = parsed.data.bids[0]
                            const bestAsk = parsed.data.asks[0]
                            if (!bestBid || !bestAsk) continue

                            const orderBook: OrderBook = {
                                bidPrice: parseFloat(bestBid[0]),
                                bidQty: parseFloat(bestBid[1]),
                                askPrice: parseFloat(bestAsk[0]),
                                askQty: parseFloat(bestAsk[1]),
                            }

                            if (
                                !Number.isFinite(orderBook.bidPrice) ||
                                !Number.isFinite(orderBook.bidQty) ||
                                !Number.isFinite(orderBook.askPrice) ||
                                !Number.isFinite(orderBook.askQty)
                            ) {
                                continue
                            }

                            resetTimeout()
                        } catch (error) {
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

/** Interfaces **/

interface OrderBookEvent {
    symbol: string;             // Symbol e.g., "SUIUSDT"
    lastUpdateId: number;       // Last update id
    bids: Array<[string, string]>;   // [[price, quantity]]
    asks: Array<[string, string]>;   // [[price, quantity]]
}

interface OrderBookStream {
    stream: string;             // e.g., "suiusdt@depth5@100ms"
    data: OrderBookEvent;
}

interface NullOrderBookStream {
   result: null
   id: number
}
