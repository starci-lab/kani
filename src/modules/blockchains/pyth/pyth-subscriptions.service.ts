import { CachePriceUtilsService } from "@modules/cache"
import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { HermesClient, PriceUpdate } from "@pythnetwork/hermes-client"
import { InjectHermesClient } from "./pyth.decorators"
import { MarketId } from "@modules/databases"
import BN from "bn.js"
import { computeDenomination } from "@utils"
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
import { EventSourceStreamConnection, StreamAsyncIteratorService } from "@modules/stream-async-iterator"

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
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
    ) { }

    onApplicationBootstrap() {
        this.subscribe()
    }

    async subscribe() {
        const feedIds = this.pythUtilsService.getPythIds()
        // seperate into batches of 5
        const batches = _.chunk(feedIds, envConfig().chunks.pythPrices.rest)
        for (const batch of batches) {
            this.retryService.retry({
                action: async () => {
                    // create the connection
                    const connection = new EventSourceStreamConnection(
                        await this.hermesClient.getPriceUpdatesStream(batch)
                    )
                    const abortController = new AbortController()
                    let timeout: NodeJS.Timeout | undefined = undefined
                    const resetTimeout = () => {
                        if (timeout) {
                            clearTimeout(timeout)
                        }
                        timeout = setTimeout(
                            () => abortController.abort(),
                            envConfig().timeConfig.ws.idleTimeout.pyth.subscriptions,
                        )
                    }
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        onOpen: () => {
                            this.logger.info(
                                WinstonLog.WebsocketConnected, {
                                    streamName: "pyth-subscriptions",
                                    symbols: batch,
                                })
                        },
                        onError: (error) => {
                            this.logger.error(
                                WinstonLog.WebsocketCloseError, {
                                    error: error.message,
                                    streamName: "pyth-subscriptions",
                                    symbols: batch,
                                })
                        },
                        onClose: () => {
                            this.logger.info(
                                WinstonLog.WebsocketClosed,
                                {
                                    streamName: "pyth-subscriptions",
                                    symbols: batch,
                                }
                            )
                        },
                    })
                    for await (const data of stream) {
                        try {
                            const update: PriceUpdate = JSON.parse(data.data)
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
                            // mark message received if there are token prices
                            if (!tokenList.length) {
                                continue
                            }
                            resetTimeout()
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
                                    streamName: "pyth-subscriptions",
                                    symbols: batch,
                                }
                            )
                        
                        }
                    }
                },
            })
        }
    }
}