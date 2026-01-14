import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
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
import { CoinMarketCapUtilsService } from "./coinmarketcap-utils.service"
import _ from "lodash"
import { CoinMarketCapTokenPriceData } from "./types"
import { CachePriceUtilsService } from "@modules/cache"
import { Interval } from "@nestjs/schedule"
import { AxiosInstance } from "axios"
import { MountStorageService } from "@modules/filesystem"
import { writeFileSync } from "fs"

@Injectable()
export class CoinMarketCapRestService implements OnApplicationBootstrap, OnModuleInit {
    private axios: AxiosInstance

    constructor(
        private readonly axiosService: AxiosService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly coinMarketCapUtilsService: CoinMarketCapUtilsService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly cachePriceUtilsService: CachePriceUtilsService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    onModuleInit() {
        const key = "coinmarketcap"
        this.axios = this.axiosService.create(
            key, {
                baseURL: "https://pro-api.coinmarketcap.com",
            }
        )
        this.axiosService.addRetry({ key })
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
    @Interval(envConfig().timeConfig.interval.coinmarketcap)
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
                    token => !!token.marketListings.find(market => market.id === MarketId.CoinMarketCap)
                )
            if (!tokens.length) {
                throw new TokenListIsEmptyException("No CoinMarketCap tokens found for mainnet")
            }
            const symbols = this.coinMarketCapUtilsService.getCoinMarketCapSymbols()
            // we split the symbols into chunks of 10
            const chunks = _.chunk(symbols, envConfig().chunks.coinmarketcapPrices?.rest || 10)
            const prices = await this.asyncService.allIgnoreError(
                chunks.map(
                    async (chunk) => {
                        const prices = await this.retryService.retry(
                            {
                                action: async () => {
                                    const ids = chunk.join(",")
                                    console.log(ids)
                                    const response = await this.axios.get<CoinMarketCapTokenPriceResponse>(
                                        "/v1/cryptocurrency/quotes/latest",
                                        {
                                            params: {
                                                id: ids,
                                            },
                                        }
                                    )
                                    writeFileSync("coinmarketcap-response.json", JSON.stringify(response.data, null, 2))
                                    return response.data
                                },
                                maxRetries: envConfig().timeConfig.retry.maxRetries,
                                delay: envConfig().timeConfig.retry.delay,
                                factor: envConfig().timeConfig.retry.factor,
                            }
                        )
                        return Object.entries(prices.data || {}).map(([symbol, data]) => ({
                            symbol,
                            price: data?.quote?.USD?.price ?? 0,
                        }))
                    }))
            const priceData = prices.flat().map<CoinMarketCapTokenPriceData>(data => ({
                symbol: data?.symbol ?? "",
                price: data?.price ?? 0,
            }))
            this.logger.info(
                WinstonLog.CoinMarketCapPricesFetched,
                {
                    fetchedCount: priceData.length,
                    expectedCount: symbols.length,
                }
            )
            const tokenList = this.coinMarketCapUtilsService.getCoinMarketCapTokenPrices(priceData)
            // cache the prices and emit the event
            await this.asyncService.allIgnoreError(
                tokenList.map(
                    async (data) => {
                        await this.cachePriceUtilsService.updateOracleTokenPrice(
                            {
                                tokenId: data.tokenId,
                                price: data.price,
                                marketId: MarketId.CoinMarketCap,
                            }
                        )
                    }
                ),
            )
        } catch (error) {
            // throw the error to prevent the application from crashing
            this.logger.error(
                WinstonLog.CoinMarketCapPricesFetchFailed,
                {
                    error: error.message,
                }
            )
        }
    }
}

export interface CoinMarketCapTokenPriceResponse {
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