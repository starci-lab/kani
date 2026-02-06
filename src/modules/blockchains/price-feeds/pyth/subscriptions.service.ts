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
    toDecimalAmount 
} from "@modules/common"
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
import {
    PYTH_SUBSCRIPTIONS_STREAM_NAME 
} from "./constants"
import Decimal from "decimal.js"

/**
 * Service for subscribing to Pyth price updates via WebSocket/SSE streams.
 * Maintains persistent connections to receive real-time price updates.
 *
 * @example
 * const service = new PythSubscriptionsService(...)
 * await service.subscribe()
 */
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

    /**
     * Initializes subscription on application bootstrap.
     */
    onApplicationBootstrap() {
        // Start subscriptions immediately on bootstrap
        this.subscribe()
    }

    /**
     * Subscribes to Pyth price update streams for all registered symbols.
     * Creates separate stream connections for each batch of symbols.
     */
    async subscribe() {
        // Get all symbols that need subscriptions
        const symbols = this.pythTokenRegistryService.getSymbols()
        if (!symbols.length) return
        // Split symbols into batches for separate stream connections
        const batches = _.chunk(symbols,
            envConfig().priceFeeds.pyth.chunks.subscription)
        // Create subscription for each batch
        for (const batch of batches) {
            this.retryService.retry({
                action: async () => {
                    // Create EventSource connection for price updates stream
                    const connection = new EventSourceStreamConnection(
                        await this.hermesClient.getPriceUpdatesStream(batch)
                    )
                    // Setup abort controller for connection timeout
                    const abortController = new AbortController()
                    let timeout: NodeJS.Timeout | undefined = undefined
                    // Reset timeout on each message to keep connection alive
                    const resetTimeout = () => {
                        if (timeout) {
                            clearTimeout(timeout)
                        }
                        timeout = setTimeout(
                            () => abortController.abort(),
                            envConfig().priceFeeds.pyth.interval.rest,
                        )
                    }
                    // Create async iterator stream from connection
                    const stream = await this.streamAsyncIteratorService.createStream({
                        connection,
                        onOpen: () => {
                            // Log successful connection
                            this.winstonService.log(
                                WinstonLog.PythSubscriptionOpened,
                                {
                                    streamName: PYTH_SUBSCRIPTIONS_STREAM_NAME,
                                    symbols: batch,
                                }
                            )
                        },
                        onClose: () => {
                            // Log connection closure
                            this.winstonService.log(
                                WinstonLog.PythSubscriptionClosed,
                                {
                                    streamName: PYTH_SUBSCRIPTIONS_STREAM_NAME,
                                    error: "Connection closed",
                                    symbols: batch,
                                }
                            )
                        },
                    })
                    // Process incoming price updates
                    for await (const data of stream) {
                        try {
                            // Parse price update from stream data
                            const update: PriceUpdate = JSON.parse(data.data)
                            // Transform price data to internal format
                            const priceData = update.parsed?.map<PythTokenPriceData>(
                                data => {
                                    // Convert price from BN with exponent to decimal
                                    const price = toDecimalAmount({
                                        amount: new BN(data?.ema_price?.price ?? 0),
                                        decimals: new Decimal(data?.ema_price?.expo ?? 8),
                                    })
                                    return {
                                        feedId: data?.id ?? "",
                                        price: price.toNumber(),
                                    }
                                }
                            ) 
                            // Resolve price data to token prices
                            const pythTokenPrices = this.pythTokenRegistryService.resolvePythTokenPrices(priceData ?? [])
                            // Skip if no valid token prices found
                            if (!pythTokenPrices.length) {
                                continue
                            }
                            // Reset timeout to keep connection alive
                            resetTimeout()
                            // Cache prices for all tokens
                            await this.asyncService.allIgnoreError(
                                pythTokenPrices.map(
                                    async (data) => {
                                        // Update cache with new price
                                        await this.aggregatedTokenPriceCacheService.set(
                                            {
                                                id: data.id,
                                                price: data.price,
                                                marketListingId: MarketListingId.Pyth,
                                            }
                                        )
                                    }
                                ),
                            )
                        } catch (error) {
                            // Log subscription errors
                            this.winstonService.log(
                                WinstonLog.PythSubscriptionError,
                                {
                                    error: error.message,
                                    streamName: PYTH_SUBSCRIPTIONS_STREAM_NAME,
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