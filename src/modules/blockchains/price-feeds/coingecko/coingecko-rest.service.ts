import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { AxiosService } from "@modules/axios"
import { MarketId, PrimaryMemoryStorageService } from "@modules/databases"
import { 
    TokenListIsEmptyException,
} from "@exceptions"
import {
    AsyncService, 
    RetryService,
} from "@modules/mixin"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { CoingeckoUtilsService } from "./coingecko-utils.service"
import _ from "lodash"
import { CoingeckoTokenPriceData } from "./types"
import { CachePriceUtilsService } from "@modules/cache"
import { Interval } from "@nestjs/schedule"
import { AxiosInstance } from "axios"

@Injectable()
export class CoingeckoRestService implements OnApplicationBootstrap {
    private axios: AxiosInstance

    constructor(
        private readonly axiosService: AxiosService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly coingeckoUtilsService: CoingeckoUtilsService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly cachePriceUtilsService: CachePriceUtilsService,
    ) {
        const key = "coingecko"
        this.axios = this.axiosService.create(key)
        this.axiosService.addRetry({ key })
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
    @Interval(envConfig().timeConfig.interval.coingecko)
    async fetchPricesInterval() {
        await this.fetchPrices()
    }

    /**
     * Fetch the prices
     */
    async fetchPrices() {
        try {
            const tokens = this.primaryMemoryStorageService.tokens
                .filter(
                    token => !!token.marketListings.find(market => market.id === MarketId.Coingecko)
                )
            if (!tokens.length) {
                throw new TokenListIsEmptyException("No Coingecko tokens found for mainnet")
            }
            const coinIds = this.coingeckoUtilsService.getCoingeckoIds()
            // we split the coin ids into chunks of 10
            const chunks = _.chunk(coinIds, envConfig().chunks.coingeckoPrices?.rest || 10)
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
                        return Object.entries(prices).map(([coinId, data]) => ({
                            coinId,
                            price: data?.usd ?? 0,
                        }))
                    }))
            const priceData = prices.flat().map<CoingeckoTokenPriceData>(data => ({
                coinId: data?.coinId ?? "",
                price: data?.price ?? 0,
            }))
            this.logger.info(
                WinstonLog.CoingeckoPricesFetched,
                {
                    fetchedCount: priceData.length,
                    expectedCount: coinIds.length,
                }
            )
            const tokenList = this.coingeckoUtilsService.getCoingeckoTokenPrices(priceData)
            // cache the prices and emit the event
            await this.asyncService.allIgnoreError(
                tokenList.map(
                    async (data) => {
                        await this.cachePriceUtilsService.updateAggregatedTokenPrice(
                            {
                                tokenId: data.tokenId,
                                price: data.price,
                                marketId: MarketId.Coingecko,
                            }
                        )
                    }
                ),
            )
        } catch (error) {
            // throw the error to prevent the application from crashing
            this.logger.error(
                WinstonLog.CoingeckoPricesFetchFailed,
                {
                    error: error.message,
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