import {
    Injectable, OnApplicationBootstrap, OnModuleInit 
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
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    CoinMarketCapTokenRegistryService 
} from "./token-registry.service"
import _ from "lodash"
import {
    CoinMarketCapTokenPriceData 
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

    onModuleInit() {
        const key = "coinmarketcap"
        this.axios = this.axiosService.create({
            key,
            config: {
                baseURL: "https://pro-api.coinmarketcap.com",
            },
        })
        this.axios.defaults.headers.common["X-CMC_PRO_API_KEY"] = this.mountStorageService.coinMarketCapApiKey
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
    @Interval(envConfig().priceFeeds.coinmarketcap.interval.rest)
    async fetchPricesInterval() {
        await this.fetchPrices()
    }

    /**
     * Fetch the prices
     */
    async fetchPrices() {
        const symbols = this.coinMarketCapTokenRegistryService.getSymbols()
        if (!symbols.length) return
        try {
            // we split the ids into chunks
            const chunks = _.chunk(symbols,
                envConfig().priceFeeds.coinmarketcap.chunks.rest)
            const prices = await this.asyncService.allIgnoreError(
                chunks.map(
                    async (chunk) => {
                        const prices = await this.retryService.retry(
                            {
                                action: async () => {
                                    const ids = chunk.join(",")
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
                        return Object.entries(prices.data || {
                        }).map(([symbol,
                            data]) => ({
                            symbol,
                            price: data?.quote?.USD?.price ?? 0,
                        }))
                    }))
            const priceData = prices.flat().map<CoinMarketCapTokenPriceData>(data => ({
                symbol: data?.symbol ?? "",
                price: data?.price ?? 0,
            }))
            if (!priceData.length) return
            this.winstonService.log(
                WinstonLog.CoinMarketCapPricesFetched,
                {
                    fetchedCount: priceData.length,
                    expectedCount: symbols.length,
                }
            )
            const tokenPrices = this.coinMarketCapTokenRegistryService.resolveCoinMarketCapTokenPrices(priceData)
            // cache the prices and emit the event
            await this.asyncService.allIgnoreError(
                tokenPrices.map(
                    async (data) => {
                        return this.asyncService.allIgnoreError(
                            [
                                this.aggregatedTokenPriceCacheService.set(
                                    {
                                        id: data.id,
                                        price: data.price,
                                        marketListingId: MarketListingId.CoinMarketCap,
                                    }
                                ),
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

export interface CoinMarketCapTokenPriceResult {
    data: {
        [symbol: string]: {
            quote: {
                USD: {
                    price: number
                }
            }
        }
    }
}