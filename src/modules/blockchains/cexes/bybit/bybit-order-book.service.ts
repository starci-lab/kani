import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { BYBIT_WS_URL } from "./constants"
import { CexId } from "@modules/databases"
import { WsConnectionClosedException, WsConnectionErrorException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { AsyncService, RetryService } from "@modules/mixin"
import { OrderBook } from "../types"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { chunkArray } from "@utils"
import { BybitUtilsService } from "./bybit-utils.service"

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
    ) {}

    onApplicationBootstrap() {
        const symbols = this.bybitUtilsService.getBybitSymbols()
        if (!symbols.length) return
    
        // Split symbols into chunks of maximum 10, due to Bybit API limit
        const symbolChunks = chunkArray(symbols, 10)

        this.retryService.retryWs<WebSocket>({
            closeFnName: "close",
            // create a new connection
            createConnection: () => new WebSocket(BYBIT_WS_URL),
            // on open event
            onOpen: async (ws, markMessageReceived) => {
                const promise = new Promise<void>((_, reject) => {
                    // open event
                    ws.on("open", () => {
                        this.logger.info(WinstonLog.WebsocketConnected, {
                            streamName: "bybit-order-book",
                        })
                        // Subscribe to each chunk separately
                        symbolChunks.forEach(chunk => {
                            ws.send(JSON.stringify({
                                op: "subscribe",
                                args: chunk.map(symbol => `orderbook.50.${symbol}`)
                            }))
                        })
                    })
                    // message event
                    ws.on("message", async (data: WebSocket.RawData) => {
                        markMessageReceived?.()
                        try {
                            const parsed = JSON.parse(data.toString()) as BybitOrderBookUpdate | BybitOrderBookWsSubscribeResponse
                            if ("success" in parsed && !parsed.success) {
                                return
                            }
                            if ("data" in parsed) {
                                const tokenId = this.bybitUtilsService.getBybitTokenIdBySymbol(parsed.data.s)
                                if (!tokenId) return

                                const bestBid = parsed.data.b?.[0]
                                const bestAsk = parsed.data.a?.[0]
                                if (!bestBid || !bestAsk) return

                                const bestBidPrice = parseFloat(bestBid[0]) // first level bid price
                                const bestBidQty = parseFloat(bestBid[1])   // first level bid qty
                                const bestAskPrice = parseFloat(bestAsk[0]) // first level ask price
                                const bestAskQty = parseFloat(bestAsk[1])   // first level ask qty

                                const orderBook: OrderBook = {
                                    bidPrice: bestBidPrice,
                                    bidQty: bestBidQty,
                                    askPrice: bestAskPrice,
                                    askQty: bestAskQty,
                                }
                                if (
                                    !Number.isFinite(orderBook.bidPrice) ||
                                    !Number.isFinite(orderBook.bidQty) ||
                                    !Number.isFinite(orderBook.askPrice) ||
                                    !Number.isFinite(orderBook.askQty)
                                ) {
                                    return
                                }

                                await this.asyncService.allIgnoreError([
                                    this.cacheManager.set(
                                        createCacheKey(CacheKey.WsCexOrderBook, {
                                            cexId: CexId.Bybit,
                                            tokenId,
                                        }),
                                        orderBook
                                    ),
                                    this.eventEmitterService.emit(EventName.WsCexOrderBookUpdated, {
                                        cexId: CexId.Bybit,
                                        tokenId,
                                        ...orderBook,
                                    })
                                ])
                            }
                        } catch (error) {
                            this.logger.error(WinstonLog.WebsocketMessageError, {
                                error: error.message,
                            })
                        }
                    })
                    // error event → close WS
                    ws.on("error", (err) => {
                        ws.close()
                        reject(new WsConnectionErrorException(err.message))
                    })
                    // close event → signal retryWs reconnect
                    ws.on("close", () => {
                        reject(new WsConnectionClosedException("WS closed"))
                    })
                })
                return await promise
            },
            onReconnect: async (error) => {
                this.logger.warn(
                    WinstonLog.WebsocketReconnect, 
                    {
                        reason: error?.message,
                        streamName: "bybit-order-book",
                    })
            },
            onFatal: async () => {
                this.logger.error(WinstonLog.WebsocketFatalError, {
                    error: "WS connection failed",
                    streamName: "bybit-order-book",
                })
            },
            options: {
                baseDelay: envConfig().timeConfig.retry.delay,
                factor: envConfig().timeConfig.retry.factor,
                maxDelay: envConfig().timeConfig.retry.maxDelay,
                maxRetries: envConfig().timeConfig.retry.maxRetries,
                jitter: true,
            },
            throwOnFatal: false,
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

export interface BybitOrderBookWsSubscribeResponse {
    success: boolean;       // true if subscription succeeded
    ret_msg: string;        // return message from server, e.g., "subscribe"
    conn_id: string;        // unique connection id for the WebSocket session
    op: "subscribe" | string; // operation type, usually "subscribe"
}