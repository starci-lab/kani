import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"
import {
    AxiosService 
} from "@modules/axios"
import {
    MarketListingId 
} from "@modules/databases"
import {
    AsyncService, 
    RetryService,
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    CoingeckoTokenRegistryService 
} from "./token-registry.service"
import _ from "lodash"
import {
    CoingeckoTokenPriceData 
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

@Injectable()
export class CoingeckoRestService implements OnApplicationBootstrap {
    private axios: AxiosInstance

    constructor(
        private readonly axiosService: AxiosService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly coingeckoTokenRegistryService: CoingeckoTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
    ) {
        const key = "coingecko"
        this.axios = this.axiosService.create(key)
    }

    /**
     * Fetch the prices and subscribe to the price updates
     */
    onApplicationBootstrap() {
        this.fetchPrices()
    }

    /**
     * Fetch the prices interval
     */
    @Interval(envConfig().time.interval.coingecko.rest)
    async fetchPricesInterval() {
        await this.fetchPrices()
    }

    /**
     * Fetch the prices
     */
    async fetchPrices() {
        const symbols = this.coingeckoTokenRegistryService.getSymbols()
        if (!symbols.length) return
        try {  
            // we split the coin ids into chunks
            const chunks = _.chunk(symbols,
                envConfig().chunks.coingecko.rest)
            const prices = await this.asyncService.allIgnoreError(
                chunks.map(
                    async (chunk) => {
                        const prices = await this.retryService.retry(
                            {
                                action: async () => {
                                    const response = await this.axios.get<CoingeckoTokenPriceResult>(
                                        "https://api.coingecko.com/api/v3/simple/price",
                                        {
                                            params: {
                                                ids: chunk.join(","),
                                                vs_currencies: "usd",
                                            },
                                        }
                                    )
                                    return response.data
                                },
                            }
                        )
                        return Object.entries(prices).map(([coinId,
                            data]) => ({
                            coinId,
                            price: data?.usd ?? 0,
                        }))
                    }))
            const priceData = prices.flat().map<CoingeckoTokenPriceData>(data => ({
                coinId: data?.coinId ?? "",
                price: data?.price ?? 0,
            }))
            if (!priceData.length) return
            this.winstonService.log(
                WinstonLog.CoingeckoPricesFetched,
                {
                    fetchedCount: priceData.length,
                    expectedCount: symbols.length,
                }
            )
            const tokenPrices = this.coingeckoTokenRegistryService.resolveCoingeckoTokenPrices(priceData)
            // cache the prices and emit the event
            await this.asyncService.allIgnoreError(
                tokenPrices.map(
                    async (data) => {
                        await this.aggregatedTokenPriceCacheService.set(
                            {
                                tokenId: data.tokenId,
                                price: data.price,
                                marketListingId: MarketListingId.Coingecko,
                            }
                        )
                    }
                ),
            )
        } catch (error) {
            // throw the error to prevent the application from crashing
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

export interface CoingeckoTokenPriceResult {
    [coinId: string]: {
        usd: number
    }
}