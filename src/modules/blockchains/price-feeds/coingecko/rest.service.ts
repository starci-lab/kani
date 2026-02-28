import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"
import {
    AxiosService 
} from "@modules/axios"
import {
    MarketListingId,
} from "@modules/databases"
import {
    AsyncService, 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    CoingeckoTokenRegistryService 
} from "./token-registry.service"
import _ from "lodash"
import {
    CoingeckoTokenPriceData,
    CoingeckoTokenPriceResult
} from "./types"
import {
    AggregatedTokenPriceCacheService 
} from "@modules/cache"
import {
    Interval 
} from "@nestjs/schedule"
import {
    AxiosInstance 
} from "axios"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    EventEmitterService, EventName 
} from "@modules/event"
import Decimal from "decimal.js"

/**
 * Service for fetching Coingecko token prices via REST API.
 * Handles periodic price fetching and caching of price data.
 *
 * @example
 * const service = new CoingeckoRestService(...)
 * await service.fetchPrices()
 */
@Injectable()
export class CoingeckoRestService implements OnApplicationBootstrap {
    private axios: AxiosInstance

    constructor(
        private readonly axiosService: AxiosService,
        private readonly asyncService: AsyncService,
        private readonly coingeckoTokenRegistryService: CoingeckoTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
        private readonly eventEmitterService: EventEmitterService,
    ) {
        // Create Axios instance for Coingecko API
        const key = "coingecko"
        this.axios = this.axiosService.create({
            key
        })
    }

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
    @Interval(envConfig().priceFeeds.coingecko.interval.rest)
    async fetchPricesInterval() {
        // Fetch prices on scheduled interval
        await this.fetchPrices()
    }

    /**
     * Fetches latest token prices from Coingecko API.
     * Splits coin IDs into chunks, fetches prices, and caches results.
     */
    async fetchPrices() {
        // Get all coin IDs that need price updates
        const symbols = this.coingeckoTokenRegistryService.getSymbols()
        if (!symbols.length) return
        try {  
            // Split coin IDs into chunks for batch processing
            const chunks = _.chunk(symbols,
                envConfig().priceFeeds.coingecko.chunks.rest)
            // Fetch prices for all chunks in parallel
            const prices = await this.asyncService.allIgnoreError(
                chunks.map(
                    async (chunk) => {
                        // Fetch latest prices from Coingecko API
                        const response = await this.axios.get<CoingeckoTokenPriceResult>(
                            "https://api.coingecko.com/api/v3/simple/price",
                            {
                                params: {
                                    ids: chunk.join(","),
                                    vs_currencies: "usd",
                                },
                            }
                        )
                        const prices = response.data
                        // Transform API response to price data format
                        return Object.entries(prices).map(([coinId,
                            data]) => ({
                            coinId,
                            price: data?.usd ?? 0,
                        }))
                    }
                )
            )
            // Map to internal price data format
            const priceData = prices.flat().map<CoingeckoTokenPriceData>(data => ({
                coinId: data?.coinId ?? "",
                price: data?.price ?? 0,
            }))
            if (!priceData.length) return
            // Log successful price fetch
            this.winstonService.log(
                WinstonLog.CoingeckoPricesFetched,
                {
                    fetchedCount: priceData.length,
                    expectedCount: symbols.length,
                }
            )
            // Resolve price data to token prices
            const tokenPrices = this.coingeckoTokenRegistryService.resolveCoingeckoTokenPrices(priceData)
            // Cache prices and emit update events
            await this.asyncService.allIgnoreError(
                tokenPrices.map(
                    async (data) => {
                        return this.asyncService.allIgnoreError(
                            [
                                // Update cache with new price
                                this.aggregatedTokenPriceCacheService.set(
                                    {
                                        id: data.id,
                                        price: data.price,
                                        marketListingId: MarketListingId.Coingecko,
                                    }
                                ),
                                // Emit event for price update
                                this.eventEmitterService.emit(
                                    {
                                        event: EventName.TokenPriceUpdated,
                                        payload: {
                                            id: data.id,
                                            price: new Decimal(data.price),
                                            marketListingId: MarketListingId.Coingecko,
                                        },
                                    }
                                ),
                            ]
                        )
                    }
                ),
            )
        } catch (error) {
            // Log error to prevent application crash
            this.winstonService.log(
                WinstonLog.CoingeckoPricesFetchFailed,
                {
                    error: error.message,
                    expectedCount: symbols.length,
                }
            )
        }
    }
}
