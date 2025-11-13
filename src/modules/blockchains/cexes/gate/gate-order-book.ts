import {
    Injectable,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { GATE_WS_URL } from "./constants"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { Network } from "@modules/common"
import { TokenListIsEmptyException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { WebsocketService } from "@modules/websocket"
import { AsyncService, DayjsService } from "@modules/mixin"
import { OrderBook } from "../types"
  
  @Injectable()
export class GateOrderBookService implements OnApplicationShutdown, OnApplicationBootstrap {
    private ws: WebSocket
  
    constructor(
      @InjectRedisCache()
      private readonly cacheManager: Cache,
      private readonly eventEmitterService: EventEmitterService,
      private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
      private readonly websocketService: WebsocketService,
      private readonly dayjsService: DayjsService,
      private readonly asyncService: AsyncService,
    ) {}
  
    onApplicationBootstrap() {
        this.ws = this.websocketService.createWebSocket({
            streamName: "gate-order-book",
            url: GATE_WS_URL,
            onMessage:async (data: GateBookTickerUpdate) => {
                const token = this.primaryMemoryStorageService.tokens
                    .find(token => token.cexSymbols?.[CexId.Gate] === data.result.s)
                if (!token) return
                const bestBidPrice = parseFloat(data.result.b)
                const bestAskPrice = parseFloat(data.result.a)
                const bestBidQty = parseFloat(data.result.B)
                const bestAskQty = parseFloat(data.result.A)
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
            },
            onOpen: () => {
                const tokens = this.primaryMemoryStorageService.tokens
                    .filter(
                        token =>
                            token.network === Network.Mainnet &&
                !!token.cexIds?.includes(CexId.Gate)
                    )
  
                if (!tokens.length) {
                    throw new TokenListIsEmptyException("No Gate.io tokens found for mainnet")
                }
  
                // Gate.io stream format: "<symbol_lowercase>.ticker"
                const symbols = tokens
                    .map(token => token.cexSymbols?.[CexId.Gate])
                    .filter(Boolean)
                    .map(symbol => `${symbol}`)
                this.ws.send(JSON.stringify({
                    channel: "spot.book_ticker",
                    event: "subscribe",
                    time: this.dayjsService.now().unix(),
                    payload: symbols,
                }))
            },
        })
    }
  
    onApplicationShutdown() {
        this.ws.close()
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