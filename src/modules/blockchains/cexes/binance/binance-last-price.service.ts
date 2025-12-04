import {
    Injectable,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from "@nestjs/common"
import { EventEmitterService, EventName  } from "@modules/event"
import { BINANCE_WS_URL } from "./constants"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenListIsEmptyException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { WebsocketService } from "@modules/websocket"
import { AsyncService } from "@modules/mixin"

@Injectable()
export class BinanceLastPriceService implements OnApplicationShutdown, OnApplicationBootstrap {
    private ws: WebSocket
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly websocketService: WebsocketService,
        private readonly asyncService: AsyncService,
    ) {
    }

    onApplicationBootstrap() {
        this.ws = this.websocketService.createWebSocket({
            streamName: "binance-last-price",
            url: BINANCE_WS_URL,
            onMessage: async (data: Ticker24hrStream | NullTicker24hrStream) => {
                if ("result" in data && data.result === null) return
                if ("data" in data) {
                    const token = this.primaryMemoryStorageService.tokens
                        .find   (
                            token => token.cexSymbols?.[CexId.Binance] === data.stream
                        )
                    if (!token) {
                        return
                    }
                    const lastPrice = parseFloat(data.data.c)
                    await this.asyncService.allIgnoreError([    
                        this.cacheManager.set(createCacheKey(
                            CacheKey.WsCexLastPrice,
                            {
                                cexId: CexId.Binance,
                                tokenId: token.displayId,
                            }
                        ), 
                        lastPrice
                        ),
                        this.eventEmitterService.emit(EventName.WsCexLastPricesUpdated, {
                            cexId: CexId.Binance,
                            tokenId: token.displayId,
                            lastPrice,
                        })
                    ])
                }
            },
            onOpen: () => {
                const tokens = this.primaryMemoryStorageService.tokens
                    .filter(
                        token => !!token.cexIds?.includes(CexId.Binance)
                    )
                if (!tokens.length) {
                    throw new TokenListIsEmptyException("No Binance tokens found for mainnet")
                }
                const symbols = tokens
                    .map(token => token.cexSymbols?.[CexId.Binance])
                    .filter(Boolean)
                    .map(symbol => `${symbol}@ticker`)
                this.ws.send(JSON.stringify({ 
                    method: "SUBSCRIBE", 
                    params: symbols, 
                    id: 1 
                }))
            },
        })
    }

    onApplicationShutdown() {
        this.ws.close()
    }
}

interface Ticker24hrEvent {
    e: string;      // Event type, e.g., "24hrTicker"
    E: number;      // Event time (timestamp)
    s: string;      // Symbol, e.g., "SUIUSDT"
    p: string;      // Price change
    P: string;      // Price change percent
    w: string;      // Weighted average price
    x: string;      // Previous day's close price
    c: string;      // Current close price
    Q: string;      // Close trade quantity
    b: string;      // Best bid price
    B: string;      // Best bid quantity
    a: string;      // Best ask price
    A: string;      // Best ask quantity
    o: string;      // Open price
    h: string;      // High price
    l: string;      // Low price
    v: string;      // Total traded base asset volume
    q: string;      // Total traded quote asset volume
    O: number;      // Statistics open time
    C: number;      // Statistics close time
    F: number;      // First trade ID
    L: number;      // Last trade ID
    n: number;      // Total number of trades
  }
  
  interface Ticker24hrStream {
    stream: string;           // Stream name, e.g., "suiusdt@ticker"
    data: Ticker24hrEvent;    // Detailed ticker data
  }

  interface NullTicker24hrStream {
    result: null
    id: number
  }