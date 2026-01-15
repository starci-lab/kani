import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { BINANCE_WS_URL } from "./constants"
import { CexId, MarketId, PrimaryMemoryStorageService } from "@modules/databases"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { AsyncService, RetryService } from "@modules/mixin"
import { OrderBook } from "../types"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { WebSocketStreamConnection, WsAsyncIteratorService } from "@modules/ws-async-iterator"

@Injectable()
export class BinanceOrderBookService implements OnApplicationBootstrap {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly wsAsyncIteratorService: WsAsyncIteratorService,
    ) {}

    onApplicationBootstrap() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(token => !!token.marketListings.find(market => market.id === MarketId.Binance))

        if (!tokens.length) {
            return
        }

        // Subscribe to top 5 levels of order book
        const symbols = tokens
            .map(token => token.marketListings.find(market => market.id === MarketId.Binance)?.symbol)
            .filter(Boolean)
            .map(symbol => `${symbol}@depth5@100ms`)

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
                        envConfig().timeConfig.retry.maxTimeout,
                    )
                }

                const asyncIterator = await this.wsAsyncIteratorService.createAsyncIterator({
                    connection,
                    signal: abortController.signal,
                    onOpen: (connection: WebSocketStreamConnection) => {
                        this.logger.info(WinstonLog.WebsocketConnected, {
                            streamName: "binance-order-book",
                        })
                        connection.ws.send(
                            JSON.stringify({
                                method: "SUBSCRIBE",
                                params: symbols,
                                id: 1,
                            }))
                    },
                    onError: (error: Error) => {
                        this.logger.error(WinstonLog.WebsocketCloseError, {
                            error: error.message,
                            streamName: "binance-order-book",
                        })
                    },
                    onClose: () => {
                        this.logger.error(WinstonLog.WebsocketClosed, {
                            streamName: "binance-order-book",
                        })
                    }
                })

                try {
                    for await (const data of asyncIterator) {
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
                            const token = tokens.find(
                                token =>
                                    token.marketListings.find(market => market.id === MarketId.Binance)?.symbol === streamSymbol
                            )
                            if (!token) continue

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

                            await this.asyncService.allIgnoreError([
                                this.cacheManager.set(
                                    createCacheKey(CacheKey.WsCexOrderBook, {
                                        cexId: CexId.Binance,
                                        tokenId: token.displayId,
                                    }),
                                    orderBook,
                                ),
                                this.eventEmitterService.emit(EventName.WsCexOrderBookUpdated, {
                                    cexId: CexId.Binance,
                                    tokenId: token.displayId,
                                    ...orderBook,
                                })
                            ])
                        } catch (error) {
                            this.logger.error(WinstonLog.WebsocketMessageError, {
                                error: error.message,
                                streamName: "binance-order-book",
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
