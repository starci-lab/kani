import {
    AggregatedTokenPriceCacheService 
} from "@modules/cache"
import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"
import {
    HermesClient, PriceUpdate 
} from "@pythnetwork/hermes-client"
import {
    InjectHermesClient 
} from "./pyth.decorators"
import {
    MarketListingId 
} from "@modules/databases"
import BN from "bn.js"
import {
    computeDenomination 
} from "@modules/utils"
import {
    AsyncService,
    RetryService,
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    PythTokenRegistryService 
} from "./token-registry.service"
import _ from "lodash"
import {
    PythTokenPriceData 
} from "./types"
import {
    EventSourceStreamConnection, StreamAsyncIteratorService 
} from "@modules/stream-async-iterator"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

const STREAM_NAME = "pyth-subscriptions"

@Injectable()
export class PythSubscriptionsService implements OnApplicationBootstrap {
    constructor(
        @InjectHermesClient() private readonly hermesClient: HermesClient,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly pythTokenRegistryService: PythTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
        private readonly streamAsyncIteratorService: StreamAsyncIteratorService,
    ) { }

    onApplicationBootstrap() {
        this.subscribe()
    }

    async subscribe() {
        const symbols = this.pythTokenRegistryService.getSymbols()
        if (!symbols.length) return
        // seperate into batches of 5
        const batches = _.chunk(symbols,
            envConfig().priceFeeds.pyth.chunks.subscription)
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
                            envConfig().priceFeeds.pyth.interval.rest,
                        )
                    }
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        onOpen: () => {
                            this.winstonService.log(
                                WinstonLog.PythSubscriptionOpened,
                                {
                                    streamName: STREAM_NAME,
                                    symbols: batch,
                                }
                            )
                        },
                        onClose: () => {
                            this.winstonService.log(
                                WinstonLog.PythSubscriptionClosed,
                                {
                                    streamName: STREAM_NAME,
                                    error: "Connection closed",
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
                            const pythTokenPrices = this.pythTokenRegistryService.resolvePythTokenPrices(priceData ?? [])
                            // mark message received if there are token prices
                            if (!pythTokenPrices.length) {
                                continue
                            }
                            resetTimeout()
                            // cache the prices and emit the event
                            await this.asyncService.allIgnoreError(
                                pythTokenPrices.map(
                                    async (data) => {
                                        await this.aggregatedTokenPriceCacheService.set(
                                            {
                                                tokenId: data.tokenId,
                                                price: data.price,
                                                marketListingId: MarketListingId.Pyth,
                                            }
                                        )
                                    }
                                ),
                            )
                        } catch (error) {
                            this.winstonService.log(
                                WinstonLog.PythSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: STREAM_NAME,
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