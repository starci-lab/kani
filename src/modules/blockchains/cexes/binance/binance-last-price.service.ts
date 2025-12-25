import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { EventEmitterService, EventName  } from "@modules/event"
import { BINANCE_WS_URL } from "./constants"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenListIsEmptyException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { AsyncService, RetryService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable()
export class BinanceLastPriceService implements OnApplicationBootstrap {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {
    }

    onApplicationBootstrap() {
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

        this.retryService.retryWs({
            // create a new connection each time the retry is called
            createConnection: () => {
                return new WebSocket(BINANCE_WS_URL)
            },
            // register the listener
            onOpen: (ws) => {
                // handle the open event
                ws.on("open", () => {
                    this.logger.info(WinstonLog.WebsocketConnected, { streamName: "binance-last-price" })
                    ws.send(JSON.stringify({ 
                        method: "SUBSCRIBE", 
                        params: symbols, 
                        id: 1 
                    }))
                })

                // handle the error - don't throw, let retryWs handle reconnection
                ws.on("error", (err) => {
                    this.logger.error(
                        WinstonLog.WebsocketCloseError,
                        {
                            error: err instanceof Error ? err.message : String(err),
                            streamName: "binance-last-price",
                        }
                    )
                    ws.close()
                    // retryWs will handle reconnection automatically
                })

                ws.on("message", async (data: WebSocket.RawData) => {
                    const parsed = JSON.parse(data.toString()) as Ticker24hrStream | NullTicker24hrStream
                    if ("result" in parsed && parsed.result === null) return
                    if ("data" in parsed) {
                        const token = this.primaryMemoryStorageService.tokens
                            .find(
                                token => token.cexSymbols?.[CexId.Binance] === parsed.stream
                            )
                        if (!token) {
                            return
                        }
                        const lastPrice = parseFloat(parsed.data.c)
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
                })
            },
            onError: (err: Error) => {
                this.logger.error(
                    WinstonLog.WebsocketCloseError, {
                        error: err.message,
                    })
            },
            options: {
                baseDelay: envConfig().timeConfig.retry.delay,
                factor: envConfig().timeConfig.retry.factor,
                maxDelay: envConfig().timeConfig.retry.maxDelay,
                maxRetries: envConfig().timeConfig.retry.maxRetries,
                jitter: true,
            }
        })
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