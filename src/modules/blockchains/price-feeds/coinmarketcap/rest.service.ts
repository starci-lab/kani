import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
} from "@nestjs/common"
import {
    AxiosService 
} from "@modules/axios"
import {
    MarketListingId,
} from "@modules/databases"
import {
    AsyncService, 
    RetryService,
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    CoinMarketCapTokenRegistryService 
} from "./token-registry.service"
import _ from "lodash"
import {
    CoinMarketCapTokenPriceData,
    CoinMarketCapTokenPriceResult
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
    MountStorageService 
} from "@modules/filesystem"
import {
    EventEmitterService, EventName 
} from "@modules/event"
import Decimal from "decimal.js"

/**
 * Service for fetching CoinMarketCap token prices via REST API.
 * Handles periodic price fetching and caching of price data.
 *
 * @example
 * const service = new CoinMarketCapRestService(...)
 * await service.fetchPrices()
 */
@Injectable()
export class CoinMarketCapRestService implements OnApplicationBootstrap, OnModuleInit {
    private axios: AxiosInstance

    constructor(
        private readonly axiosService: AxiosService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly coinMarketCapTokenRegistryService: CoinMarketCapTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
        private readonly mountStorageService: MountStorageService,
        private readonly eventEmitterService: EventEmitterService,
    ) {}

    /**
     * Initializes Axios instance with CoinMarketCap API configuration.
     */
    onModuleInit() {
        // Create Axios instance for CoinMarketCap API
        const key = "coinmarketcap"
        this.axios = this.axiosService.create({
            key,
            config: {
                baseURL: "https://pro-api.coinmarketcap.com",
            },
        })
        // Set API key from mounted storage
        this.axios.defaults.headers.common["X-CMC_PRO_API_KEY"] = this.mountStorageService.coinMarketCapApiKey
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
    @Interval(envConfig().priceFeeds.coinmarketcap.interval.rest)
    async fetchPricesInterval() {
        // Fetch prices on scheduled interval
        await this.fetchPrices()
    }

    /**
     * Fetches latest token prices from CoinMarketCap API.
     * Splits symbols into chunks, fetches prices, and caches results.
     */
    async fetchPrices() {
        // Get all symbols that need price updates
        const symbols = this.coinMarketCapTokenRegistryService.getSymbols()
        if (!symbols.length) return
        try {
            // Split symbols into chunks for batch processing
            const chunks = _.chunk(symbols,
                envConfig().priceFeeds.coinmarketcap.chunks.rest)
            // Fetch prices for all chunks in parallel
            const prices = await this.asyncService.allIgnoreError(
                chunks.map(
                    async (chunk) => {
                        // Retry on failure to ensure reliability
                        const prices = await this.retryService.retry(
                            {
                                action: async () => {
                                    // Join chunk IDs for API request
                                    const ids = chunk.join(",")
                                    // Fetch latest quotes from CoinMarketCap API
                                    const response = await this.axios.get<CoinMarketCapTokenPriceResult>(
                                        "/v1/cryptocurrency/quotes/latest",
                                        {
                                            params: {
                                                id: ids,
                                            },
                                        }
                                    )
                                    return response.data
                                },
                            }
                        )
                        // Transform API response to price data format
                        return Object.entries(prices.data || {
                        }).map(([symbol,
                            data]) => ({
                            symbol,
                            price: data?.quote?.USD?.price ?? 0,
                        }))
                    }))
            // Map to internal price data format
            const priceData = prices.flat().map<CoinMarketCapTokenPriceData>(data => ({
                symbol: data?.symbol ?? "",
                price: data?.price ?? 0,
            }))
            if (!priceData.length) return
            // Log successful price fetch
            this.winstonService.log(
                WinstonLog.CoinMarketCapPricesFetched,
                {
                    fetchedCount: priceData.length,
                    expectedCount: symbols.length,
                }
            )
            // Resolve price data to token prices
            const tokenPrices = this.coinMarketCapTokenRegistryService.resolveCoinMarketCapTokenPrices(priceData)
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
                                        marketListingId: MarketListingId.CoinMarketCap,
                                    }
                                ),
                                // Emit event for price update
                                this.eventEmitterService.emit(
                                    {
                                        event: EventName.TokenPriceUpdated,
                                        payload: {
                                            id: data.id,
                                            price: new Decimal(data.price),
                                            marketListingId: MarketListingId.CoinMarketCap,
                                        },
                                    }
                                ),
                            ]
                        )
                    }
                ),
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.CoinMarketCapPricesFetchFailed,
                {
                    error: error.message,
                    expectedCount: symbols.length,
                }
            )
        }
    }
}
