import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { GATE_WS_URL } from "./constants"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenListIsEmptyException, WsConnectionClosedException, WsConnectionErrorException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { AsyncService, DayjsService, RetryService } from "@modules/mixin"
import { OrderBook } from "../types"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
  
@Injectable()
export class GateOrderBookService implements OnApplicationBootstrap {
    constructor(
      @InjectRedisCache()
      private readonly cacheManager: Cache,
      private readonly eventEmitterService: EventEmitterService,
      private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
      private readonly retryService: RetryService,
      private readonly dayjsService: DayjsService,
      private readonly asyncService: AsyncService,
      @InjectWinston()
      private readonly logger: WinstonLogger,
    ) {}
  
    onApplicationBootstrap() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.cexIds?.includes(CexId.Gate)
            )

        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Gate.io tokens found for mainnet")
        }

        // Gate.io stream format: "<symbol_lowercase>.ticker"
        const symbols = tokens
            .map(token => token.cexSymbols?.[CexId.Gate])
            .filter(Boolean)
            .map(symbol => `${symbol}`)

        this.retryService.retryWs<WebSocket>({
            closeFnName: "close",
            // create a new connection
            createConnection: () => new WebSocket(GATE_WS_URL),
            // on open event
            onOpen: async (ws, markMessageReceived) => {
                const promise = new Promise<void>((_, reject) => {
                    // open event
                    ws.on("open", () => {
                        this.logger.info(WinstonLog.WebsocketConnected, {
                            streamName: "gate-order-book",
                        })
                        ws.send(JSON.stringify({
                            channel: "spot.book_ticker",
                            event: "subscribe",
                            time: this.dayjsService.now().unix(),
                            payload: symbols,
                        }))
                    })
                    // message event
                    ws.on("message", async (data: WebSocket.RawData) => {
                        markMessageReceived?.()
                        try {
                            const parsed = JSON.parse(data.toString()) as GateBookTickerUpdate
                            const token = this.primaryMemoryStorageService.tokens
                                .find(token => token.cexSymbols?.[CexId.Gate] === parsed.result.s)
                            if (!token) return
                            const bestBidPrice = parseFloat(parsed.result.b)
                            const bestAskPrice = parseFloat(parsed.result.a)
                            const bestBidQty = parseFloat(parsed.result.B)
                            const bestAskQty = parseFloat(parsed.result.A)
                            // cache the last price and emit the event in parallel
                            const orderBook: OrderBook = {
                                bidPrice: bestBidPrice,
                                bidQty: bestBidQty,
                                askPrice: bestAskPrice,
                                askQty: bestAskQty,
                            }   
                            await this.asyncService.allIgnoreError([
                                this.cacheManager.set(
                                    createCacheKey(CacheKey.WsCexOrderBook, {
                                        cexId: CexId.Gate,
                                        tokenId: token.displayId,
                                    }),
                                    orderBook
                                ),  
                                this.eventEmitterService.emit(
                                    EventName.WsCexOrderBookUpdated, {
                                        cexId: CexId.Gate,
                                        tokenId: token.displayId,
                                        ...orderBook,
                                    })
                            ])
                        } catch (error) {
                            this.logger.error(
                                WinstonLog.WebsocketMessageError, {
                                    error: error.message,
                                }
                            )
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
                        streamName: "gate-order-book",
                    })
            },
            onFatal: async () => {
                this.logger.error(WinstonLog.WebsocketFatalError, {
                    error: "WS connection failed",
                    streamName: "gate-order-book",
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
  
export interface GateBookTickerUpdate {
    time: number;       // timestamp in seconds
    time_ms: number;    // timestamp in milliseconds
    channel: "spot.book_ticker";
    event: "update";
    result: GateBookTickerResult;
  }
  
export interface GateBookTickerResult {
    t: number;   // update time in milliseconds
    u: number;   // update ID or sequence number
    s: string;   // currency pair, e.g., "DEEP_USDT"
    b: string;   // best bid price
    B: string;   // best bid quantity
    a: string;   // best ask price
    A: string;   // best ask quantity
  }