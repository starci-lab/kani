import {
    Injectable,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { BYBIT_WS_URL } from "./constants"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenListIsEmptyException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { WebsocketService } from "@modules/websocket"
import { AsyncService } from "@modules/mixin"
import { OrderBook } from "../types"

@Injectable()
export class BybitOrderBookService implements OnApplicationShutdown, OnApplicationBootstrap {
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
            streamName: "bybit-order-book",
            url: BYBIT_WS_URL,
            onMessage: async (data: BybitOrderBookUpdate | BybitOrderBookWsSubscribeResponse) => {
                if ("success" in data && !data.success) {
                    return
                }
                if ("data" in data) {
                    // Find token in local memory
                    const token = this.primaryMemoryStorageService.tokens
                        .find(t => t.cexSymbols?.[CexId.Bybit] === data.data.s)
                    if (!token) return

                    const bestBidPrice = parseFloat(data.data.b?.[0]?.[0] || "0") // first level bid price
                    const bestBidQty = parseFloat(data.data.b?.[0]?.[1] || "0")   // first level bid qty
                    const bestAskPrice = parseFloat(data.data.a?.[0]?.[0] || "0") // first level ask price
                    const bestAskQty = parseFloat(data.data.a?.[0]?.[1] || "0")   // first level ask qty

                    const orderBook: OrderBook = {
                        bidPrice: bestBidPrice,
                        bidQty: bestBidQty,
                        askPrice: bestAskPrice,
                        askQty: bestAskQty,
                    }

                    await this.asyncService.allIgnoreError([
                        this.cacheManager.set(
                            createCacheKey(CacheKey.WsCexOrderBook, {
                                cexId: CexId.Bybit,
                                tokenId: token.displayId,
                            }),
                            orderBook
                        ),
                        this.eventEmitterService.emit(EventName.WsCexOrderBookUpdated, {
                            cexId: CexId.Bybit,
                            tokenId: token.displayId,
                            ...orderBook,
                        })
                    ])
                }
            },
            onOpen: () => {
                const tokens = this.primaryMemoryStorageService.tokens
                    .filter(
                        token => !!token.cexIds?.includes(CexId.Bybit)
                    )
                if (!tokens.length) {
                    throw new TokenListIsEmptyException("No Bybit tokens found for mainnet")
                }

                // Extract Bybit symbols from the tokens
                const symbols = tokens
                    .map(token => token.cexSymbols?.[CexId.Bybit])
                    .filter(Boolean)
            
                // Helper function to split an array into chunks of max `size`
                const chunkArray = <T>(arr: T[], size: number): T[][] => {
                    const chunks: Array<Array<T>> = []
                    for (let i = 0; i < arr.length; i += size) {
                        chunks.push(arr.slice(i, i + size))
                    }
                    return chunks
                }
            
                // Split symbols into chunks of maximum 10, due to Bybit API limit
                const symbolChunks = chunkArray(symbols, 10)
                // Subscribe to each chunk separately
                symbolChunks.forEach(chunk => {
                    this.ws.send(JSON.stringify({
                        op: "subscribe",
                        args: chunk.map(symbol => `orderbook.50.${symbol}`)
                    }))
                })
            },
        })
    }

    onApplicationShutdown() {
        this.ws.close()
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