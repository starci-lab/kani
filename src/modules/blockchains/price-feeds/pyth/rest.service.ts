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
} from "@modules/databases"
import BN from "bn.js"
import {
    toDecimalAmount 
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

@Injectable()
export class PythRestService implements OnApplicationBootstrap {
    constructor(
        @InjectHermesClient() private readonly hermesClient: HermesClient,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly pythTokenRegistryService: PythTokenRegistryService,
        private readonly winstonService: WinstonService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
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
    @Interval(envConfig().priceFeeds.pyth.interval.rest)
    async fetchPricesInterval() {
        await this.fetchPrices()
    }

    /**
     * Fetch the prices
     */
    async fetchPrices() {
        const symbols = this.pythTokenRegistryService.getSymbols()
        if (!symbols.length) return
        try {
            // we split the symbols into chunks
            const chunks = _.chunk(symbols,
                envConfig().priceFeeds.pyth.chunks.rest)
            const prices = await this.asyncService.allIgnoreError(
                chunks.map(
                    async (chunk) => {
                        const prices = await this.retryService.retry(
                            {
                                action: () => this.hermesClient.getLatestPriceUpdates(chunk),
                            }
                        )
                        return prices.parsed
                    }))
            const priceData = prices.flat().map<PythTokenPriceData>(
                data => {
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
            this.winstonService.log(
                WinstonLog.PythRestPricesFetched,
                {
                    fetchedCount: priceData.length,
                    expectedCount: symbols.length
                }
            )
            const pythTokenPrices = this.pythTokenRegistryService.resolvePythTokenPrices(priceData)
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
                WinstonLog.PythRestPricesFetchFailed,
                {
                    error: error.message,
                    expectedCount: symbols.length
                }
            )
        }
    }
}