import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    BYBIT_WS_URL 
} from "./constants"
import {
    RetryService 
} from "@modules/mixin"
import {
    DayjsService 
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
    BybitTokenRegistryService 
} from "./token-registry.service"
import {
    WebSocketStreamConnection, StreamAsyncIteratorService 
} from "@modules/stream-async-iterator"
import _ from "lodash"

@Injectable()
export class BybitOrderBookService implements OnApplicationBootstrap {
    constructor(
        private readonly bybitTokenRegistryService: BybitTokenRegistryService,
        private readonly retryService: RetryService,
        private readonly winstonService: WinstonService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
        private readonly dayjsService: DayjsService,
    ) {}

    onApplicationBootstrap() {
        const symbols = this.bybitTokenRegistryService.getSymbols()
        if (!symbols.length) return
    
        // Split symbols into chunks (Bybit has a limit on subscription args)
        const symbolChunks = _.chunk(
            symbols,
            envConfig().cexes.bybit.chunks.orderBook
        )

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

                const startTime = this.dayjsService.now()
                const stream = await this.streamAsyncIteratorService.createStream({
                    connection,
                    signal: abortController.signal,
                    onOpen: (connection: WebSocketStreamConnection) => {
                        this.winstonService.log(WinstonLog.WebsocketSubscriptionOpened,
                            {
                                streamName: "bybit-order-book",
                                symbols,
                            })
                        resetTimeout()
                        for (const chunk of symbolChunks) {
                            connection.ws.send(JSON.stringify({
                                op: "subscribe",
                                args: chunk.map(symbol => `orderbook.50.${symbol}`),
                            }))
                        }
                    },
                    onError: (error: Error) => {
                        this.winstonService.log(WinstonLog.WebsocketSubscriptionError,
                            {
                                error: error.message,
                                streamName: "bybit-order-book",
                                symbols,
                            })
                    },
                    onClose: () => {
                        this.winstonService.log(WinstonLog.WebsocketSubscriptionClosed,
                            {
                                streamName: "bybit-order-book",
                                symbols,
                                durationMs: this.dayjsService.now().diff(
                                    startTime,
                                    "millisecond"
                                ),
                            })
                    }
                })

                for await (const data of stream) {
                    try {
                        const parsed = JSON.parse(data.toString()) as BybitOrderBookUpdate | BybitOrderBookWsSubscribeResult
                        if ("success" in parsed) {
                            if (!parsed.success) {
                                continue
                            }
                            // subscription ACK
                            continue
                        }

                        if (!("data" in parsed)) {
                            continue
                        }

                        const tokenId = this.bybitTokenRegistryService.getTokenIdBySymbol({
                            symbol: parsed.data.s 
                        })
                        if (!tokenId) continue

                        const bestBid = parsed.data.b?.[0]
                        const bestAsk = parsed.data.a?.[0]
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
                        this.winstonService.log(WinstonLog.WebsocketSubscriptionError,
                            {
                                error: error.message,
                                streamName: "bybit-order-book",
                                symbols,
                            })
                    }
                }
            }
        })
    }
}

// Bybit order book WS message
export interface BybitOrderBookUpdate {
    topic: string; // e.g., "orderBookL2_25.BTCUSDT"
    ts: number;    // timestamp in ms
    type: "snapshot" | "delta";
    data: BybitOrderBookData;
}

export interface BybitOrderBookData {
    s: string;         // symbol, e.g., "BTCUSDT"
    b: Array<[string, string]>; // bids [[price, size], ...]
    a: Array<[string, string]>; // asks [[price, size], ...]
    ts: number;        // update timestamp
}

export interface BybitOrderBookWsSubscribeResult {
    success: boolean;       // true if subscription succeeded
    ret_msg: string;        // return message from server, e.g., "subscribe"
    conn_id: string;        // unique connection id for the WebSocket session
    op: "subscribe" | string; // operation type, usually "subscribe"
}