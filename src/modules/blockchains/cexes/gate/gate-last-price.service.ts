import {
    Injectable,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { GATE_WS_URL } from "./constants"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenListIsEmptyException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { WebsocketService } from "@modules/websocket"
import { AsyncService, DayjsService } from "@modules/mixin"
  
  @Injectable()
export class GateLastPriceService implements OnApplicationShutdown, OnApplicationBootstrap {
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
            streamName: "gate-last-price",
            url: GATE_WS_URL,
            onMessage:async (data: GateTickerUpdate) => {
                const token = this.primaryMemoryStorageService.tokens
                    .find(token => token.cexSymbols?.[CexId.Gate] === data.result.currency_pair)
                if (!token) return
                const lastPrice = parseFloat(data.result.last)
                // cache the last price and emit the event in parallel
                await this.asyncService.allIgnoreError([
                    this.cacheManager.set(
                        createCacheKey(CacheKey.WsCexLastPrice, {
                            cexId: CexId.Gate,
                            tokenId: token.displayId,
                        }),
                        lastPrice
                    ),  
                    this.eventEmitterService.emit(EventName.WsCexLastPricesUpdated, {
                        cexId: CexId.Gate,
                        tokenId: token.displayId,
                        lastPrice,
                    })
                ])
            },
            onOpen: () => {
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
                this.ws.send(JSON.stringify({
                    channel: "spot.tickers",
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
  
export interface GateTickerUpdate {
    time: number;       // current timestamp in seconds
    time_ms: number;    // current timestamp in milliseconds
    channel: "spot.tickers";
    event: "update";
    result: GateTickerResult;
  }
  
export interface GateTickerResult {
    currency_pair: string;      // e.g., "SOL_USDT"
    last: string;               // last price
    lowest_ask: string;         // lowest ask price
    highest_bid: string;        // highest bid price
    change_percentage: string;  // 24h change percentage
    base_volume: string;        // base currency volume
    quote_volume: string;       // quote currency volume
    high_24h: string;           // 24h high price
    low_24h: string;            // 24h low price
}