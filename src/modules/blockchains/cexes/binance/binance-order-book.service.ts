import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { BINANCE_WS_URL } from "./constants"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenListIsEmptyException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { AsyncService, RetryService } from "@modules/mixin"
import { OrderBook } from "../types"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

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
    ) {}

    onApplicationBootstrap() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(token => !!token.cexIds?.includes(CexId.Binance))

        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Binance tokens found for mainnet")
        }

        // Subscribe to top 5 levels of order book
        const symbols = tokens
            .map(token => token.cexSymbols?.[CexId.Binance])
            .filter(Boolean)
            .map(symbol => `${symbol}@depth5@100ms`)

        this.retryService.retryWs({
            // create a new connection each time the retry is called
            createConnection: () => {
                return new WebSocket(BINANCE_WS_URL)
            },
            // register the listener
            onOpen: (ws) => {
                // handle the open event
                ws.on("open", () => {
                    this.logger.info(WinstonLog.WebsocketConnected, { streamName: "binance-order-book" })
                    ws.send(JSON.stringify({
                        method: "SUBSCRIBE",
                        params: symbols,
                        id: 1
                    }))
                })

                // handle the error - don't throw, let retryWs handle reconnection
                ws.on("error", (err) => {
                    this.logger.error(
                        WinstonLog.WebsocketCloseError,
                        {
                            error: err instanceof Error ? err.message : String(err),
                            streamName: "binance-order-book",
                        }
                    )
                    ws.close()
                    // retryWs will handle reconnection automatically
                })

                ws.on("message", async (data: WebSocket.RawData) => {
                    const parsed = JSON.parse(data.toString()) as OrderBookStream | NullOrderBookStream
                    if ("result" in parsed && parsed.result === null) return
                    if ("data" in parsed) {
                        const token = this.primaryMemoryStorageService.tokens
                            .find(token => token.cexSymbols?.[CexId.Binance] === parsed.stream)
                        if (!token) return
                        // Only take top-of-book (best bid/ask)
                        const bestBid = parsed.data.bids[0]
                        const bestAsk = parsed.data.asks[0]

                        if (!bestBid || !bestAsk) return

                        const orderBook: OrderBook = {
                            bidPrice: parseFloat(bestBid[0]),
                            bidQty: parseFloat(bestBid[1]),
                            askPrice: parseFloat(bestAsk[0]),
                            askQty: parseFloat(bestAsk[1]),
                        }
                        await this.asyncService.allIgnoreError([
                        // Cache best bid/ask
                            this.cacheManager.set(
                                createCacheKey(CacheKey.WsCexOrderBook, {
                                    cexId: CexId.Binance,
                                    tokenId: token.displayId,
                                }),
                                orderBook
                            ),
                            // Emit event
                            this.eventEmitterService.emit(EventName.WsCexOrderBookUpdated, {
                                cexId: CexId.Binance,
                                tokenId: token.displayId,
                                ...orderBook,
                            })
                        ])
                    }
                })
            },
            onError: (err: Error) => {
                this.logger.error(
                    WinstonLog.WebsocketCloseError, {
                        error: err.message,
                    })
            },
            options: {
                baseDelay: envConfig().timeConfig.retry.delay,
                factor: envConfig().timeConfig.retry.factor,
                maxDelay: envConfig().timeConfig.retry.maxDelay,
                maxRetries: envConfig().timeConfig.retry.maxRetries,
                jitter: true,
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
