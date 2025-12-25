import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { EventEmitterService, EventName } from "@modules/event"
import { GATE_WS_URL } from "./constants"
import { CexId, PrimaryMemoryStorageService } from "@modules/databases"
import { TokenListIsEmptyException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import WebSocket from "ws"
import { AsyncService, DayjsService, RetryService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
  
@Injectable()
export class GateLastPriceService implements OnApplicationBootstrap {
    constructor(
      @InjectRedisCache()
      private readonly cacheManager: Cache,
      private readonly eventEmitterService: EventEmitterService,
      private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
      private readonly dayjsService: DayjsService,
      private readonly asyncService: AsyncService,
      private readonly retryService: RetryService,
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

        this.retryService.retryWs({
            // create a new connection each time the retry is called
            createConnection: () => {
                return new WebSocket(GATE_WS_URL)
            },
            // register the listener
            onOpen: (ws) => {
                // handle the open event
                ws.on("open", () => {
                    this.logger.info(WinstonLog.WebsocketConnected, { streamName: "gate-last-price" })
                    ws.send(JSON.stringify({
                        channel: "spot.tickers",
                        event: "subscribe",
                        time: this.dayjsService.now().unix(),
                        payload: symbols,
                    }))
                })

                // handle the error - don't throw, let retryWs handle reconnection
                ws.on("error", (err) => {
                    this.logger.error(
                        WinstonLog.WebsocketCloseError,
                        {
                            error: err instanceof Error ? err.message : String(err),
                            streamName: "gate-last-price",
                        }
                    )
                    ws.close()
                    // retryWs will handle reconnection automatically
                })

                ws.on("message", async (data: WebSocket.RawData) => {
                    const parsed = JSON.parse(data.toString()) as GateTickerUpdate
                    const token = this.primaryMemoryStorageService.tokens
                        .find(token => token.cexSymbols?.[CexId.Gate] === parsed.result.currency_pair)
                    if (!token) return
                    const lastPrice = parseFloat(parsed.result.last)
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