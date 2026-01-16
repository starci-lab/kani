import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { GATE_WS_URL } from "./constants"
import { MarketId } from "@modules/databases"
import { CachePriceUtilsService } from "@modules/cache"
import { AsyncService, DayjsService, RetryService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { GateUtilsService } from "./gate-utils.service"
import { WebSocketStreamConnection, StreamAsyncIteratorService } from "@modules/stream-async-iterator"

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
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
    ) { }

    onApplicationBootstrap() {
        const symbols = this.gateUtilsService.getGateSymbols()
        if (!symbols.length) return

        this.retryService.retry(
            {
                options: {
                    retries: Infinity
                },
                action: async () => {
                    const connection = new WebSocketStreamConnection(GATE_WS_URL)
                    const abortController = new AbortController()
                    let timeout: NodeJS.Timeout | undefined = undefined

                    const resetTimeout = () => {
                        if (timeout) {
                            clearTimeout(timeout)
                        }
                        timeout = setTimeout(
                            () => abortController.abort(),
                            envConfig().timeConfig.ws.idleTimeout.gate.lastPrice,
                        )
                    }
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        signal: abortController.signal,
                        onOpen: (connection: WebSocketStreamConnection) => {
                            this.logger.info(
                                WinstonLog.WebsocketConnected,
                                {
                                    streamName: "gate-last-price",
                                    symbols,
                                })
                            resetTimeout()
                            connection.ws.send(
                                JSON.stringify({
                                    channel: "spot.tickers",
                                    event: "subscribe",
                                    time: this.dayjsService.now().unix(),
                                    payload: symbols,
                                }))
                        },
                        onError: (error: Error) => {
                            this.logger.error(
                                WinstonLog.WebsocketCloseError, {
                                    error: error.message,
                                    streamName: "gate-last-price",
                                    symbols,
                                }
                            )
                        },
                        onClose: () => {
                            this.logger.error(
                                WinstonLog.WebsocketClosed, {
                                    streamName: "gate-last-price",
                                    symbols,
                                }
                            )
                        }
                    })

                    try {
                        for await (const data of stream) {
                            try {
                                const parsed = JSON.parse(data.toString()) as GateTickerUpdate
                                const tokenPrices = this.gateUtilsService.getGateTokenPrices([
                                    {
                                        symbol: parsed.result.currency_pair,
                                        price: parseFloat(parsed.result.last),
                                    }
                                ])
                                if (!tokenPrices.length) {
                                    continue
                                }
                                resetTimeout()
                                // update the token prices
                                await this.asyncService.allIgnoreError(
                                    tokenPrices.map(
                                        (tokenPrice) =>
                                            this.cachePriceUtilsService.updateOracleTokenPrice({
                                                tokenId: tokenPrice.tokenId,
                                                price: tokenPrice.price,
                                                marketId: MarketId.Gate,
                                            }
                                            )
                                    )
                                )
                            } catch (error) {
                                this.logger.error(
                                    WinstonLog.WebsocketMessageError, {
                                        error: error.message,
                                        streamName: "gate-last-price",
                                        symbols,
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