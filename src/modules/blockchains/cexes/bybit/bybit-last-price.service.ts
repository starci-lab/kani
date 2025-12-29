import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenListIsEmptyException, WsConnectionClosedException, WsConnectionErrorException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { AsyncService, RetryService } from "@modules/mixin"
import { BYBIT_WS_URL } from "./constants"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { chunkArray } from "@utils"
  
@Injectable()
export class BybitLastPriceService implements OnApplicationBootstrap {
    constructor(
      @InjectRedisCache()
      private readonly cacheManager: Cache,
      private readonly eventEmitterService: EventEmitterService,
      private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
      private readonly asyncService: AsyncService,
      private readonly retryService: RetryService,
      @InjectWinston()
      private readonly logger: WinstonLogger,
    ) {}
  
    onApplicationBootstrap() {
        // Filter tokens for mainnet and those listed on Bybit
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token =>
                    !!token.cexIds?.includes(CexId.Bybit)
            )
    
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Bybit tokens found for mainnet")
        }
    
        // Extract Bybit symbols from the tokens
        const symbols = tokens
            .map(token => token.cexSymbols?.[CexId.Bybit])
            .filter(Boolean)
    
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
                            streamName: "bybit-last-price",
                        })
                        // Subscribe to each chunk separately
                        symbolChunks.forEach(chunk => {
                            ws.send(JSON.stringify({
                                op: "subscribe",
                                args: chunk.map(symbol => `tickers.${symbol}`)
                            }))
                        })
                    })
                    // message event
                    ws.on("message", async (data: WebSocket.RawData) => {
                        markMessageReceived?.()
                        try {
                            const parsed = JSON.parse(data.toString()) as BybitTickerUpdate | BybitWsSubscribeResponse
                            if ("success" in parsed && !parsed.success) {
                                return
                            }
                            if ("data" in parsed) {
                                const token = this.primaryMemoryStorageService.tokens
                                    .find(token => token.cexSymbols?.[CexId.Bybit] === parsed.data.symbol)
                                if (!token) return
                                const lastPrice = parseFloat(parsed.data.lastPrice)
                                await this.asyncService.allIgnoreError([
                                    this.cacheManager.set(
                                        createCacheKey(CacheKey.WsCexLastPrice, {
                                            cexId: CexId.Bybit,
                                            tokenId: token.displayId,
                                        }),
                                        lastPrice
                                    ),
                                    this.eventEmitterService.emit(
                                        EventName.WsCexLastPricesUpdated, {
                                            cexId: CexId.Bybit,
                                            tokenId: token.displayId,
                                            lastPrice,
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
                        streamName: "bybit-last-price",
                    })
            },
            onFatal: async () => {
                this.logger.error(WinstonLog.WebsocketFatalError, {
                    error: "WS connection failed",
                    streamName: "bybit-last-price",
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
  
// Interface theo docs Bybit v5
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
export interface BybitWsSubscribeResponse {
    success: boolean;       // true if subscription succeeded
    ret_msg: string;        // return message from server, e.g., "subscribe"
    conn_id: string;        // unique connection id for the WebSocket session
    op: "subscribe" | string; // operation type, usually "subscribe"
}
