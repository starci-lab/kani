import { CachePriceUtilsService } from "@modules/cache"
import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { HermesClient, PriceUpdate } from "@pythnetwork/hermes-client"
import { InjectHermesClient } from "./pyth.decorators"
import { MarketId } from "@modules/databases"
import BN from "bn.js"
import { computeDenomination } from "@utils"
import { 
    WsConnectionClosedException,
    WsConnectionErrorException,
} from "@exceptions"
import {
    AsyncService,  
    RetryService,
} from "@modules/mixin"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { PythUtilsService } from "./pyth-utils.service"
import _ from "lodash"
import { PythTokenPriceData } from "./types"

@Injectable()
export class PythSubscriptionsService implements OnApplicationBootstrap {
    constructor(
        @InjectHermesClient() private readonly hermesClient: HermesClient,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly pythUtilsService: PythUtilsService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly cachePriceUtilsService: CachePriceUtilsService,
    ) {}

    onApplicationBootstrap() {
        this.subscribe()
    }

    async subscribe() {
        const feedIds = this.pythUtilsService.getPythIds()
        // seperate into batches of 5
        const batches = _.chunk(feedIds, envConfig().chunks.pythPrices.subscriptions)
        for (const batch of batches) {
        // we split the feed ids into chunks of 5
            this.retryService.retryWs({
                closeFnName: "close",
                // create a new connection each time the retry is called
                createConnection: async () => {
                    return this.hermesClient.getPriceUpdatesStream(batch)
                },
                // register the listener
                onOpen: async (stream, markMessageReceived) => {
                    const promise = new Promise<void>((_, reject) => {
                    // handle the open event
                        stream.addEventListener("open", () => {
                            this.logger.info(WinstonLog.WebsocketConnected, { streamName: "pyth-price-updates" })
                        })
                        // handle the error - reject to signal retryWs reconnect
                        stream.addEventListener("error", (err) => {
                            stream.close()
                            reject(new WsConnectionErrorException(err.message))
                        })
                        // handle the close event - reject to signal retryWs reconnect
                        stream.addEventListener("close", () => {
                            reject(new WsConnectionClosedException("WS closed"))
                        })
                        stream.addEventListener(
                            "message",
                            async (event: MessageEvent<string>) => {
                                try {
                                    const update: PriceUpdate = JSON.parse(event.data)
                                    markMessageReceived?.()
                                    const priceData = update.parsed?.map<PythTokenPriceData>(data => {
                                        const price = computeDenomination(
                                            new BN(data?.ema_price?.price ?? 0), 
                                            data?.ema_price?.expo ?? 8
                                        )
                                        return {
                                            feedId: data?.id ?? "",
                                            price: price.toNumber(),
                                        }
                                    }) 
                                    const tokenList = this.pythUtilsService.getPythTokenPrices(priceData ?? [])
                                    // cache the prices and emit the event
                                    await this.asyncService.allIgnoreError(
                                        tokenList.map(
                                            async (data) => {
                                                await this.cachePriceUtilsService.updateOracleTokenPrice(
                                                    {
                                                        tokenId: data.tokenId,
                                                        price: data.price,
                                                        marketId: MarketId.Pyth,
                                                    }
                                                )
                                            }
                                        ),
                                    )
                                } catch (error) {
                                    this.logger.error(
                                        WinstonLog.PythPricesSubscriptionFailed, {
                                            error: error.message,
                                        }
                                    )
                                }
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
                            streamName: "pyth-price-updates",
                        })
                },
                onFatal: async () => {
                    this.logger.error(
                        WinstonLog.WebsocketFatalError, {
                            error: "WS connection failed",
                            streamName: "pyth-price-updates",
                        }
                    )
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
}