import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { BINANCE_WS_URL } from "./constants"
import { MarketId, PrimaryMemoryStorageService } from "@modules/databases"
import { WsConnectionClosedException, WsConnectionErrorException } from "@exceptions"
import WebSocket from "ws"
import { AsyncService, RetryService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { CachePriceUtilsService } from "@modules/cache"
import { BinanceUtilsService } from "./binance-utils.service"
import _ from "lodash"

@Injectable()
export class BinanceLastPriceService implements OnApplicationBootstrap {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly retryService: RetryService,
        private readonly binanceUtilsService: BinanceUtilsService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly cachePriceUtilsService: CachePriceUtilsService,
        private readonly asyncService: AsyncService,
    ) {
    }

    onApplicationBootstrap() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.marketListings.find(market => market.id === MarketId.Binance)
            )
        if (!tokens.length) {
            return
        }
        const symbols = this.binanceUtilsService.getBinanceSymbols()
        const batches = _.chunk(symbols, envConfig().chunks.pythPrices.subscriptions)
        for (const batch of batches) {
            this.retryService.retryWs<WebSocket>({
                // close the websocket
                closeFnName: "close",
                // create a new connection
                createConnection: () => new WebSocket(BINANCE_WS_URL),
                // on open event
                onOpen: async (ws, markMessageReceived) => {
                    const promise = new Promise<void>((_, reject) => {
                        // open event
                        ws.on("open", () => {
                            this.logger.info(
                                WinstonLog.WebsocketConnected, {
                                    streamName: "binance-last-price",
                                }
                            )
                            ws.send(
                                JSON.stringify(
                                    {
                                        method: "SUBSCRIBE",
                                        params: batch,
                                        id: 1,
                                    }
                                ),
                            )
                        })
                        // message event
                        ws.on("message", async (data: WebSocket.RawData) => {
                            try {
                                const parsed = JSON.parse(
                                    data.toString(),
                                ) as Ticker24hrStream | NullTicker24hrStream
              
                                if ("result" in parsed && parsed.result === null) return
                                if (!("data" in parsed)) return

                                const streamSymbol = parsed.stream.split("@")[0]
                                const tokenPrices = this.binanceUtilsService.getBinanceTokenPrices(
                                    [
                                        {
                                            price: parseFloat(parsed.data.c),
                                            symbol: streamSymbol,
                                        }
                                    ]
                                )
                                // mark message received if there are token prices
                                if (tokenPrices.length) {
                                    // mark message received if there are token prices
                                    markMessageReceived?.()
                                } else {
                                    // return if there are no token prices
                                    return
                                }
                                await this.asyncService.allIgnoreError(
                                    tokenPrices.map(async (tokenPrice) => {
                                        await this.cachePriceUtilsService.updateOracleTokenPrice(
                                            {
                                                tokenId: tokenPrice.tokenId,
                                                price: tokenPrice.price,
                                                marketId: MarketId.Binance,
                                            }
                                        )
                                    })
                                )
                            } catch (error) {
                                this.logger.error(
                                    WinstonLog.WebsocketMessageError, {
                                        error: error.message,
                                    }
                                )
                            }
                        })
                        // error event throw error and close WS
                        ws.on("error", (err) => {
                            ws.close()
                            reject(new WsConnectionErrorException(err.message))
                        }
                        )
                        // close event reject promise and signal retryWs reconnect
                        ws.on("close", () => {
                            reject(new WsConnectionClosedException("WS closed"))
                        }
                        )
                    })
                    return await promise
                },
                onReconnect: async (error) => {
                    this.logger.warn(
                        WinstonLog.WebsocketReconnect, 
                        {
                            reason: error?.message,
                            streamName: "binance-last-price",
                        })
                },
                onFatal: async () => {
                    this.logger.error(
                        WinstonLog.WebsocketFatalError, {
                            error: "WS connection failed",
                            streamName: "binance-last-price",
                        }
                    )
                },
                options: {},
                throwOnFatal: false,
            })
        }
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