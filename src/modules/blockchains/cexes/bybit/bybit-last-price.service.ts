import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { MarketId } from "@modules/databases"
import { CachePriceUtilsService } from "@modules/cache"
import { AsyncService, RetryService } from "@modules/mixin"
import { BYBIT_WS_URL } from "./constants"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { BybitUtilsService } from "./bybit-utils.service"
import _ from "lodash"
import { WebSocketStreamConnection, WsAsyncIteratorService } from "@modules/ws-async-iterator"
  
@Injectable()
export class BybitLastPriceService implements OnApplicationBootstrap {
    constructor(
      private readonly retryService: RetryService,
      private readonly bybitUtilsService: BybitUtilsService,
      @InjectWinston()
      private readonly logger: WinstonLogger,
      private readonly cachePriceUtilsService: CachePriceUtilsService,
      private readonly asyncService: AsyncService,
      private readonly wsAsyncIteratorService: WsAsyncIteratorService,
    ) {}
  
    onApplicationBootstrap() {
        const symbols = this.bybitUtilsService.getBybitSymbols()
        if (!symbols.length) return
    
        // Split symbols into chunks of maximum 10, due to Bybit API limit
        const batches = _.chunk(symbols, envConfig().chunks.bybitLastPrice.subscriptions)
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
                            envConfig().timeConfig.ws.idleTimeout.bybit.lastPrice,
                        )
                    }

                    const asyncIterator = await this.wsAsyncIteratorService.createAsyncIterator({
                        connection,
                        signal: abortController.signal,
                        onOpen: (connection: WebSocketStreamConnection) => {
                            this.logger.info(WinstonLog.WebsocketConnected, {
                                streamName: "bybit-last-price",
                                symbols: batch,
                            })
                            resetTimeout()
                            connection.ws.send(JSON.stringify({
                                op: "subscribe",
                                args: batch.map(symbol => `tickers.${symbol}`),
                            }))
                        },
                        onError: (error: Error) => {
                            this.logger.error(
                                WinstonLog.WebsocketCloseError, {
                                    error: error.message,
                                    streamName: "bybit-last-price",
                                    symbols: batch,
                                })
                        },
                        onClose: () => {
                            this.logger.error(
                                WinstonLog.WebsocketClosed, {
                                    streamName: "bybit-last-price",
                                    symbols: batch,
                                }
                            )
                        }
                    })

                    try {
                        for await (const data of asyncIterator) {
                            try {
                                const parsed = JSON.parse(data.toString()) as BybitTickerUpdate | BybitWsSubscribeResponse

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

                                const tokenPrices = this.bybitUtilsService.getBybitTokenPrices([
                                    {
                                        symbol: parsed.data.symbol,
                                        price: parseFloat(parsed.data.lastPrice),
                                    }
                                ])

                                if (!tokenPrices.length) {
                                    continue
                                }
                                resetTimeout()
                                await this.asyncService.allIgnoreError(
                                    tokenPrices.map((tokenPrice) =>
                                        this.cachePriceUtilsService.updateOracleTokenPrice({
                                            tokenId: tokenPrice.tokenId,
                                            price: tokenPrice.price,
                                            marketId: MarketId.Bybit,
                                        })
                                    )
                                )
                            } catch (error) {
                                this.logger.error(WinstonLog.WebsocketMessageError, {
                                    error: error.message,
                                    streamName: "bybit-last-price",
                                    symbols: batch,
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
