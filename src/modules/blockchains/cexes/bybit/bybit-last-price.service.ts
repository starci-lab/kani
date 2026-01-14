import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { MarketId } from "@modules/databases"
import { WsConnectionClosedException, WsConnectionErrorException } from "@exceptions"
import { CachePriceUtilsService } from "@modules/cache"
import WebSocket from "ws"
import { AsyncService, RetryService } from "@modules/mixin"
import { BYBIT_WS_URL } from "./constants"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { BybitUtilsService } from "./bybit-utils.service"
import _ from "lodash"
  
@Injectable()
export class BybitLastPriceService implements OnApplicationBootstrap {
    constructor(
      private readonly retryService: RetryService,
      private readonly bybitUtilsService: BybitUtilsService,
      @InjectWinston()
      private readonly logger: WinstonLogger,
      private readonly cachePriceUtilsService: CachePriceUtilsService,
      private readonly asyncService: AsyncService,
    ) {}
  
    onApplicationBootstrap() {
        const symbols = this.bybitUtilsService.getBybitSymbols()
        if (!symbols.length) return
    
        // Split symbols into chunks of maximum 10, due to Bybit API limit
        const batches = _.chunk(symbols, envConfig().chunks.pythPrices.subscriptions)
        for (const batch of batches) {
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
                            ws.send(JSON.stringify({
                                op: "subscribe",
                                args: batch.map(symbol => `tickers.${symbol}`)
                            }))
                        })
                        // message event
                        ws.on("message", async (data: WebSocket.RawData) => {
                            try {
                                const parsed = JSON.parse(data.toString()) as BybitTickerUpdate | BybitWsSubscribeResponse
                                if ("success" in parsed && !parsed.success) {
                                    return
                                }
                                if ("data" in parsed) {
                                    const tokenPrices = this.bybitUtilsService.getBybitTokenPrices([
                                        {
                                            symbol: parsed.data.symbol,
                                            price: parseFloat(parsed.data.lastPrice),
                                        }
                                    ])
                                    // mark message received if there are token prices
                                    if (tokenPrices.length) {
                                        markMessageReceived?.()
                                    } else {
                                        // return if there are no token prices
                                        return
                                    }
                                    await this.asyncService.allIgnoreError(
                                        tokenPrices.map((tokenPrice) =>
                                            this.cachePriceUtilsService.updateOracleTokenPrice({
                                                tokenId: tokenPrice.tokenId,
                                                price: tokenPrice.price,
                                                marketId: MarketId.Bybit,
                                            })
                                        )
                                    )
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
                options: {},
                throwOnFatal: false,
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
