import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"
import {
    HermesClient 
} from "@pythnetwork/hermes-client"
import {
    InjectHermesClient 
} from "./pyth.decorators"
import {
    MarketListingId,
    PrimaryInfluxdbPriceBucketService
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
} from "./types/token-price"
import {
    AggregatedTokenPriceCacheService 
} from "@modules/cache"
import {
    Interval 
} from "@nestjs/schedule"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import Decimal from "decimal.js"
import {
    EventEmitterService, EventName 
} from "@modules/event"

/**
 * Service for fetching Pyth token prices via REST API.
 * Handles periodic price fetching and caching of price data.
 *
 * @example
 * const service = new PythRestService(...)
 * await service.fetchPrices()
 */
@Injectable()
export class PythRestService implements OnApplicationBootstrap {
    constructor(
        @InjectHermesClient() private readonly hermesClient: HermesClient,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly pythTokenRegistryService: PythTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
    ) {}

    /**
     * Initializes price fetching on application bootstrap.
     */
    onApplicationBootstrap() {
        // Start fetching prices immediately on bootstrap
        this.fetchPrices()
    }

    /**
     * Scheduled interval handler for fetching prices.
     * Runs at configured interval to keep prices up to date.
     */
    @Interval(envConfig().priceFeeds.pyth.interval.rest)
    async fetchPricesInterval() {
        // Fetch prices on scheduled interval
        await this.fetchPrices()
    }

    /**
     * Fetches latest token prices from Pyth network.
     * Splits symbols into chunks, fetches prices, and caches results.
     */
    async fetchPrices() {
        // Get all symbols that need price updates
        const symbols = this.pythTokenRegistryService.getSymbols()
        if (!symbols.length) return
        try {
            // Split symbols into chunks for batch processing
            const chunks = _.chunk(symbols,
                envConfig().priceFeeds.pyth.chunks.rest)
            // Fetch prices for all chunks in parallel
            const prices = await this.asyncService.allIgnoreError(
                chunks.map(
                    async (chunk) => {
                        // Retry on failure to ensure reliability
                        const prices = await this.retryService.retry(
                            {
                                action: () => this.hermesClient.getLatestPriceUpdates(chunk),
                            }
                        )
                        return prices.parsed
                    }))
            // Transform API response to internal price data format
            const priceData = prices.flat().map<PythTokenPriceData>(
                data => {
                    // Convert price from BN with exponent to decimal
                    const price = toDecimalAmount({
                        amount: new BN(data?.ema_price?.price ?? 0),
                        decimals: new Decimal(data?.ema_price?.expo ?? 8),
                    })
                    return {
                        feedId: data?.id ?? "",
                        price: price.toNumber() ?? 0,
                    }
                }) 
            if (!priceData.length) return
            // Log successful price fetch
            this.winstonService.log(
                WinstonLog.PythRestPricesFetched,
                {
                    fetchedCount: priceData.length,
                    expectedCount: symbols.length
                }
            )
            // Resolve price data to token prices
            const pythTokenPrices = this.pythTokenRegistryService.resolvePythTokenPrices(priceData)
            // Cache prices and emit update events
            await this.asyncService.allIgnoreError(
                pythTokenPrices.map(
                    async (data) => {
                        return this.asyncService.allIgnoreError([
                            // Update cache with new price
                            this.aggregatedTokenPriceCacheService.set(
                                {
                                    id: data.id,
                                    price: data.price,
                                    marketListingId: MarketListingId.Pyth,
                                }
                            ),
                            // Emit event for price update
                            this.eventEmitterService.emit(
                                {
                                    event: EventName.TokenPriceUpdated,
                                    payload: {
                                        id: data.id,
                                        price: new Decimal(data.price),
                                        marketListingId: MarketListingId.Pyth,
                                    },
                                }
                            ),
                            // Update influxdb with new price
                            this.primaryInfluxdbPriceBucketService.write(
                                {
                                    id: data.id,
                                    price: new Decimal(data.price),
                                    marketListingId: MarketListingId.Pyth,
                                }
                            ),
                        ])
                    }
                ),
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.PythRestPricesFetchFailed,
                {
                    error: error.message,
                    expectedCount: symbols.length
                }
            )
        }
    }
}