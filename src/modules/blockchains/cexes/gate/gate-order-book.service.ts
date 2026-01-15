import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { GATE_WS_URL } from "./constants"
import { CexId } from "@modules/databases"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { AsyncService, DayjsService, RetryService } from "@modules/mixin"
import { OrderBook } from "../types"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { GateUtilsService } from "./gate-utils.service"
import { WebSocketStreamConnection, WsAsyncIteratorService } from "@modules/ws-async-iterator"
  
@Injectable()
export class GateOrderBookService implements OnApplicationBootstrap {
    constructor(
      @InjectRedisCache()
      private readonly cacheManager: Cache,
      private readonly eventEmitterService: EventEmitterService,
      private readonly gateUtilsService: GateUtilsService,
      private readonly retryService: RetryService,
      private readonly dayjsService: DayjsService,
      private readonly asyncService: AsyncService,
      @InjectWinston()
      private readonly logger: WinstonLogger,
      private readonly wsAsyncIteratorService: WsAsyncIteratorService,
    ) {}
  
    onApplicationBootstrap() {
        const symbols = this.gateUtilsService.getGateSymbols()
        if (!symbols.length) return

        this.retryService.retry({
            options: {
                retries: Infinity,
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
                        envConfig().timeConfig.retry.maxTimeout,
                    )
                }

                const asyncIterator = await this.wsAsyncIteratorService.createAsyncIterator({
                    connection,
                    signal: abortController.signal,
                    onOpen: (connection: WebSocketStreamConnection) => {
                        this.logger.info(WinstonLog.WebsocketConnected, {
                            streamName: "gate-order-book",
                        })
                        resetTimeout()
                        connection.ws.send(JSON.stringify({
                            channel: "spot.book_ticker",
                            event: "subscribe",
                            time: this.dayjsService.now().unix(),
                            payload: symbols,
                        }))
                    },
                    onError: (error: Error) => {
                        this.logger.error(WinstonLog.WebsocketCloseError, {
                            error: error.message,
                            streamName: "gate-order-book",
                        })
                    },
                    onClose: () => {
                        this.logger.error(WinstonLog.WebsocketClosed, {
                            streamName: "gate-order-book",
                        })
                    }
                })

                try {
                    for await (const data of asyncIterator) {
                        try {
                            const parsed = JSON.parse(data.toString()) as GateBookTickerUpdate
                            const tokenId = this.gateUtilsService.getGateTokenIdBySymbol(parsed.result.s)
                            if (!tokenId) continue

                            const orderBook: OrderBook = {
                                bidPrice: parseFloat(parsed.result.b),
                                bidQty: parseFloat(parsed.result.B),
                                askPrice: parseFloat(parsed.result.a),
                                askQty: parseFloat(parsed.result.A),
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
                                        cexId: CexId.Gate,
                                        tokenId,
                                    }),
                                    orderBook,
                                ),
                                this.eventEmitterService.emit(EventName.WsCexOrderBookUpdated, {
                                    cexId: CexId.Gate,
                                    tokenId,
                                    ...orderBook,
                                })
                            ])
                        } catch (error) {
                            this.logger.error(WinstonLog.WebsocketMessageError, {
                                error: error.message,
                                streamName: "gate-order-book",
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