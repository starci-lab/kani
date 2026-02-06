import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    MarketListingId 
} from "@modules/databases"
import {
    AggregatedTokenPriceCacheService 
} from "@modules/cache"
import {
    AsyncService, 
    DayjsService, 
    RetryService 
} from "@modules/mixin"
import {
    BYBIT_LAST_PRICE_STREAM_NAME,
    BYBIT_WS_URL 
} from "./constants"
import {
    envConfig 
} from "@modules/env"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    BybitTokenRegistryService 
} from "./token-registry.service"
import _ from "lodash"
import {
    WebSocketStreamConnection, StreamAsyncIteratorService 
} from "@modules/stream-async-iterator"
import {
    EventEmitterService, EventName 
} from "@modules/event"
import Decimal from "decimal.js"
import {
    Dayjs 
} from "dayjs"
  
@Injectable()
export class BybitLastPriceService implements OnApplicationBootstrap {
    constructor(
      private readonly retryService: RetryService,
      private readonly bybitTokenRegistryService: BybitTokenRegistryService,
      private readonly winstonService: WinstonService,
      private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
      private readonly asyncService: AsyncService,
      private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
      private readonly dayjsService: DayjsService,
      private readonly eventEmitterService: EventEmitterService,
    ) {}
  
    onApplicationBootstrap() {
        const symbols = this.bybitTokenRegistryService.getSymbols()
        if (!symbols.length) return
        // Split symbols into chunks (Bybit has a limit on subscription args)
        const batches = _.chunk(
            symbols,
            envConfig().cexes.bybit.chunks.lastPrice
        )
        for (const batch of batches) {
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
                            envConfig().cexes.ws.idleTimeout,
                        )
                    }

                    let startTime: Dayjs | null = null
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        signal: abortController.signal,
                        onOpen: (connection: WebSocketStreamConnection) => {
                            this.winstonService.log(WinstonLog.WebsocketSubscriptionOpened,
                                {
                                    streamName: BYBIT_LAST_PRICE_STREAM_NAME,
                                    symbols: batch,
                                })
                            startTime = this.dayjsService.now()
                            resetTimeout()
                            connection.ws.send(JSON.stringify({
                                op: "subscribe",
                                args: batch.map(symbol => `tickers.${symbol}`),
                            }))
                        },
                        onError: (error: Error) => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: BYBIT_LAST_PRICE_STREAM_NAME,
                                    symbols: batch,
                                })
                        },
                        onClose: () => {
                            this.winstonService.log(
                                WinstonLog.WebsocketSubscriptionClosed,
                                {
                                    streamName: BYBIT_LAST_PRICE_STREAM_NAME,
                                    symbols: batch,
                                    durationMs: this.dayjsService.now().diff(
                                        startTime,
                                        "millisecond"
                                    ),
                                }
                            )
                        }
                    })

                    try {
                        for await (const data of stream) {
                            try {
                                const parsed = JSON.parse(data.toString()) as BybitTickerUpdate | BybitWsSubscribeResult
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

                                const tokenPrices = this.bybitTokenRegistryService.resolveTokenPrices({
                                    tokenPriceDataArray: [
                                        {
                                            symbol: parsed.data.symbol,
                                            price: parseFloat(parsed.data.lastPrice),
                                        }
                                    ]
                                })

                                if (!tokenPrices.length) {
                                    continue
                                }
                                resetTimeout()
                                await this.asyncService.allIgnoreError(
                                    tokenPrices.map((tokenPrice) => 
                                        this.asyncService.allIgnoreError(
                                            [
                                                this.aggregatedTokenPriceCacheService.set({
                                                    id: tokenPrice.id,
                                                    price: tokenPrice.price,
                                                    marketListingId: MarketListingId.Bybit,
                                                }),
                                                this.eventEmitterService.emit(
                                                    {
                                                        event: EventName.TokenPriceUpdated,
                                                        payload: {
                                                            id: tokenPrice.id,
                                                            price: new Decimal(tokenPrice.price),
                                                            marketListingId: MarketListingId.Bybit,
                                                        },
                                                    }
                                                ),
                                            ]
                                        )
                                    )
                                )
                            } catch (error) {
                                this.winstonService.log(
                                    WinstonLog.WebsocketSubscriptionError,
                                    {
                                        error: error.message,
                                        streamName: "bybit-last-price",
                                        symbols: batch,
                                    }
                                )
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
}
  
// Bybit WS v5: ticker update payload
export interface BybitTickerUpdate {
    topic: string;         // e.g., "tickers.BTCUSDT"
    type: string;          // e.g., "snapshot" or "delta" :contentReference[oaicite:1]{index=1}
    ts: number;            // timestamp in milliseconds :contentReference[oaicite:2]{index=2}
    cs?: number;           // cross sequence (optional) :contentReference[oaicite:3]{index=3}
    data: BybitTickerData;
  }
  
export interface BybitTickerData {
    symbol: string;          // e.g., "BTCUSDT"
    tickDirection?: string;  // e.g., "PlusTick" or "MinusTick" :contentReference[oaicite:4]{index=4}
    price24hPcnt: string;    // percentage change last 24h :contentReference[oaicite:5]{index=5}
    lastPrice: string;       // last price :contentReference[oaicite:6]{index=6}
    prevPrice24h?: string;   // price 24h ago :contentReference[oaicite:7]{index=7}
    highPrice24h?: string;   // highest price last 24h :contentReference[oaicite:8]{index=8}
    lowPrice24h?: string;    // lowest price last 24h :contentReference[oaicite:9]{index=9}
    bid1Price?: string;      // best bid price :contentReference[oaicite:10]{index=10}
    bid1Size?: string;       // best bid size :contentReference[oaicite:11]{index=11}
    ask1Price?: string;      // best ask price :contentReference[oaicite:12]{index=12}
    ask1Size?: string;       // best ask size :contentReference[oaicite:13]{index=13}
    volume24h?: string;      // volume last 24h :contentReference[oaicite:14]{index=14}
    turnover24h?: string;    // turnover last 24h :contentReference[oaicite:15]{index=15}
}
  

// Interface for Bybit WebSocket subscription confirmation
export interface BybitWsSubscribeResult {
    success: boolean;       // true if subscription succeeded
    ret_msg: string;        // return message from server, e.g., "subscribe"
    conn_id: string;        // unique connection id for the WebSocket session
    op: "subscribe" | string; // operation type, usually "subscribe"
}
