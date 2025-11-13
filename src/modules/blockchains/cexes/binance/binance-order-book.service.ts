import {
    Injectable,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { BINANCE_WS_URL } from "./constants"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { Network } from "@modules/common"
import { TokenListIsEmptyException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { WebsocketService } from "@modules/websocket"
import { AsyncService } from "@modules/mixin"
import { OrderBook } from "../types"

@Injectable()
export class BinanceOrderBookService implements OnApplicationShutdown, OnApplicationBootstrap {
    private ws: WebSocket

    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly websocketService: WebsocketService,
        private readonly asyncService: AsyncService,
    ) {}

    onApplicationBootstrap() {
        this.ws = this.websocketService.createWebSocket({
            streamName: "binance-order-book",
            url: BINANCE_WS_URL,
            onMessage: async (data: OrderBookStream | NullOrderBookStream) => {
                if ("result" in data && data.result === null) return
                if ("data" in data) {
                    const token = this.primaryMemoryStorageService.tokens
                        .find(token => token.cexSymbols?.[CexId.Binance] === data.stream)
                    if (!token) return
                    // Only take top-of-book (best bid/ask)
                    const bestBid = data.data.bids[0]
                    const bestAsk = data.data.asks[0]

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
            },
            onOpen: () => {
                const tokens = this.primaryMemoryStorageService.tokens
                    .filter(token =>
                        token.network === Network.Mainnet &&
                        !!token.cexIds?.includes(CexId.Binance)
                    )

                if (!tokens.length) {
                    throw new TokenListIsEmptyException("No Binance tokens found for mainnet")
                }

                // Subscribe to top 5 levels of order book
                const symbols = tokens
                    .map(token => token.cexSymbols?.[CexId.Binance])
                    .filter(Boolean)
                    .map(symbol => `${symbol}@depth5@100ms`)

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
