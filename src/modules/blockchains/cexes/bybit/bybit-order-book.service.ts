import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { BYBIT_WS_URL } from "./constants"
import { CexId } from "@modules/databases"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { AsyncService, RetryService } from "@modules/mixin"
import { OrderBook } from "../types"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { chunkArray } from "@modules/utils"
import { BybitUtilsService } from "./bybit-utils.service"
import { WebSocketStreamConnection, StreamAsyncIteratorService } from "@modules/stream-async-iterator"

@Injectable()
export class BybitOrderBookService implements OnApplicationBootstrap {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly eventEmitterService: EventEmitterService,
        private readonly bybitUtilsService: BybitUtilsService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
    ) {}

    onApplicationBootstrap() {
        const symbols = this.bybitUtilsService.getBybitSymbols()
        if (!symbols.length) return
    
        // Split symbols into chunks of maximum 10, due to Bybit API limit
        const symbolChunks = chunkArray(symbols, 10)

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
                        envConfig().timeConfig.retry.maxTimeout,
                    )
                }

                const stream = await this.streamAsyncIteratorService.createStream({
                    connection,
                    signal: abortController.signal,
                    onOpen: (connection: WebSocketStreamConnection) => {
                        this.logger.info(WinstonLog.WebsocketConnected, {
                            streamName: "bybit-order-book",
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
                        this.logger.error(WinstonLog.WebsocketCloseError, {
                            error: error.message,
                            streamName: "bybit-order-book",
                        })
                    },
                    onClose: () => {
                        this.logger.error(WinstonLog.WebsocketClosed, {
                            streamName: "bybit-order-book",
                        })
                    }
                })

                try {
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

                            const tokenId = this.bybitUtilsService.getBybitTokenIdBySymbol(parsed.data.s)
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

                            await this.asyncService.allIgnoreError([
                                this.cacheManager.set(
                                    createCacheKey(CacheKey.WsCexOrderBook, {
                                        cexId: CexId.Bybit,
                                        tokenId,
                                    }),
                                    orderBook,
                                ),
                                this.eventEmitterService.emit(EventName.WsCexOrderBookUpdated, {
                                    cexId: CexId.Bybit,
                                    tokenId,
                                    ...orderBook,
                                })
                            ])
                        } catch (error) {
                            this.logger.error(WinstonLog.WebsocketMessageError, {
                                error: error.message,
                                streamName: "bybit-order-book",
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