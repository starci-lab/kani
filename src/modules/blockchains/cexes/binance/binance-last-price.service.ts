import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import { BINANCE_WS_URL } from "./constants"
import { MarketId, PrimaryMemoryStorageService } from "@modules/databases"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { CachePriceUtilsService } from "@modules/cache"
import { BinanceUtilsService } from "./binance-utils.service"
import _ from "lodash"
import { AsyncService, RetryService } from "@modules/mixin"
import { WebSocketStreamConnection, WsAsyncIteratorService } from "@modules/ws-async-iterator"
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
        private readonly wsAsyncIteratorService: WsAsyncIteratorService,
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
        const batches = _.chunk(symbols, envConfig().chunks.binanceLastPrice.subscriptions)
        for (const batch of batches) {
            this.retryService.retry(
                {
                    options: {
                        retries: Infinity,
                    },
                    action: async () => {
                        // create the connection
                        const connection = new WebSocketStreamConnection(
                            BINANCE_WS_URL
                        )
                        // create the abort controller
                        const abortController = new AbortController()
                        // create the timeout
                        let timeout: NodeJS.Timeout | undefined = undefined
                        // on
                        // create the reset timeout function
                        const resetTimeout = () => {
                            if (timeout) {
                                clearTimeout(timeout)
                            }
                            timeout = setTimeout(
                                () => abortController.abort(), 
                                envConfig().timeConfig.ws.idleTimeout.binance.lastPrice,
                            )
                        }
                        // create the async iterator
                        const asyncIterator = await this.wsAsyncIteratorService.createAsyncIterator(
                            {
                                connection,
                                signal: abortController.signal,
                                onOpen: (
                                    connection: WebSocketStreamConnection
                                ) => {
                                    this.logger.info(
                                        WinstonLog.WebsocketConnected, {
                                            streamName: "binance-last-price",
                                            symbols: batch,
                                        }
                                    )
                                    connection.ws.send(
                                        JSON.stringify(
                                            {
                                                method: "SUBSCRIBE",
                                                params: batch,
                                                id: 1,
                                            }
                                        ),
                                    )
                                },
                                onError: (error: Error) => {
                                    this.logger.error(
                                        WinstonLog.WebsocketCloseError, {
                                            error: error.message,
                                            streamName: "binance-last-price",
                                            symbols: batch,
                                        }
                                    )
                                },
                                onClose: () => {
                                    this.logger.error(
                                        WinstonLog.WebsocketClosed, {
                                            streamName: "binance-last-price",
                                            symbols: batch,
                                        }
                                    )
                                }
                            }
                        )
                        // subscribe to the async iterator
                        for await (const data of asyncIterator) {
                            try {
                                // parse the data
                                const parsed = JSON.parse(
                                    data.toString(),
                                ) as Ticker24hrStream | NullTicker24hrStream
                                // if the result is null then return
                                if ("result" in parsed && parsed.result === null) continue
                                // if the data is not in the parsed data then return
                                if (!("data" in parsed)) continue
                                // get the stream symbol
                                const streamSymbol = parsed.stream.split("@")[0]
                                // get the token prices
                                const tokenPrices = this.binanceUtilsService.getBinanceTokenPrices(
                                    [
                                        {
                                            price: parseFloat(parsed.data.c),
                                            symbol: streamSymbol,
                                        }
                                    ]
                                )
                                if (!tokenPrices.length) {
                                    continue
                                }
                                resetTimeout()
                                // update the token prices
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
                            // log the error
                                this.logger.error(
                                    WinstonLog.WebsocketMessageError, {
                                        error: error.message,
                                        streamName: "binance-last-price",
                                        symbols: batch,
                                    }
                                )
                            }
                        }
                    }
                },
                
            )
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