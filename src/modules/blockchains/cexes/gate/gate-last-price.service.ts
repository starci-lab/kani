import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { GATE_WS_URL } from "./constants"
import { MarketId } from "@modules/databases"
import { WsConnectionClosedException, WsConnectionErrorException } from "@exceptions"
import { CachePriceUtilsService } from "@modules/cache"
import WebSocket from "ws"
import { AsyncService, DayjsService, RetryService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { GateUtilsService } from "./gate-utils.service"
  
@Injectable()
export class GateLastPriceService implements OnApplicationBootstrap {
    constructor(
      private readonly dayjsService: DayjsService,
      private readonly retryService: RetryService,
      private readonly gateUtilsService: GateUtilsService,
      @InjectWinston()
      private readonly logger: WinstonLogger,
      private readonly cachePriceUtilsService: CachePriceUtilsService,
      private readonly asyncService: AsyncService,
    ) {}
  
    onApplicationBootstrap() {
        const symbols = this.gateUtilsService.getGateSymbols()
        if (!symbols.length) return

        this.retryService.retryWs<WebSocket>({
            closeFnName: "close",
            // create a new connection
            createConnection: () => new WebSocket(GATE_WS_URL),
            // on open event
            onOpen: async (ws, markMessageReceived) => {
                const promise = new Promise<void>((_, reject) => {
                    // open event
                    ws.on("open", () => {
                        this.logger.info(WinstonLog.WebsocketConnected, {
                            streamName: "gate-last-price",
                        })
                        ws.send(JSON.stringify({
                            channel: "spot.tickers",
                            event: "subscribe",
                            time: this.dayjsService.now().unix(),
                            payload: symbols,
                        }))
                    })
                    // message event
                    ws.on("message", async (data: WebSocket.RawData) => {
                        try {
                            const parsed = JSON.parse(data.toString()) as GateTickerUpdate
                            const tokenPrices = this.gateUtilsService.getGateTokenPrices(
                                [
                                    {
                                        symbol: parsed.result.currency_pair,
                                        price: parseFloat(parsed.result.last),
                                    }
                                ]
                            )
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
                                        marketId: MarketId.Gate,
                                    })
                                )
                            )
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
                        streamName: "gate-last-price",
                    })
            },
            onFatal: async () => {
                this.logger.error(WinstonLog.WebsocketFatalError, {
                    error: "WS connection failed",
                    streamName: "gate-last-price",
                })
            },
            options: {},
            throwOnFatal: false,
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