import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { HermesClient } from "@pythnetwork/hermes-client"
import { InjectHermesClient } from "./pyth.decorators"
import { MarketId, PrimaryMemoryStorageService } from "@modules/databases"
import BN from "bn.js"
import { computeDenomination } from "@utils"
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
import { PythUtilsService } from "./pyth-utils.service"
import _ from "lodash"
import { PythTokenPriceData } from "./types"
import { CachePriceUtilsService } from "@modules/cache"
import { Interval } from "@nestjs/schedule"

@Injectable()
export class PythRestService implements OnApplicationBootstrap {
    constructor(
        @InjectHermesClient() private readonly hermesClient: HermesClient,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly pythUtilsService: PythUtilsService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly cachePriceUtilsService: CachePriceUtilsService,
    ) {}

    /**
     * Fetch the prices and subscribe to the price updates
     */
    onApplicationBootstrap() {
        this.fetchPrices()
    }

    /**
     * Fetch the prices interval
     */
    @Interval(envConfig().timeConfig.interval.pyth.rest)
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
                    token => !!token.marketListings.find(market => market.id === MarketId.Pyth)
                )
            if (!tokens.length) {
                throw new TokenListIsEmptyException("No Pyth tokens found for mainnet")
            }
            const feedIds = this.pythUtilsService.getPythIds()
            // we split the feed ids into chunks of 5
            const chunks = _.chunk(feedIds, envConfig().chunks.pythPrices.rest)
            const prices = await this.asyncService.allIgnoreError(
                chunks.map(
                    async (chunk) => {
                        const prices = await this.retryService.retry(
                            {
                                action: () => this.hermesClient.getLatestPriceUpdates(chunk),
                                maxRetries: envConfig().timeConfig.retry.maxRetries,
                                delay: envConfig().timeConfig.retry.delay,
                                factor: envConfig().timeConfig.retry.factor,
                            }
                        )
                        return prices.parsed
                    }))
            const priceData = prices.flat().map<PythTokenPriceData>(data => {
                const price = computeDenomination(
                    new BN(data?.ema_price?.price ?? 0), 
                    data?.ema_price?.expo ?? 8
                )
                return {
                    feedId: data?.id ?? "",
                    price: price.toNumber(),
                }
            }) 
            this.logger.info(
                WinstonLog.PythPricesFetched,
                {
                    fetchedCount: priceData.length,
                    expectedCount: feedIds.length,
                }
            )
            const tokenList = this.pythUtilsService.getPythTokenPrices(priceData)
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
            // throw the error to prevent the application from crashing
            this.logger.error(
                WinstonLog.PythPricesFetchFailed,
                {
                    error: error.message,
                }
            )
        }
    }
}