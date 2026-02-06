import {
    DexId,
    LiquidityPoolSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import {
    CacheKey,
    PoolAnalyticsCacheResult,
    CacheService,
} from "@modules/cache"
import {
    Interval
} from "@nestjs/schedule"
import {
    AsyncService, LokiJSService, DayjsService
} from "@modules/mixin"
import {
    envConfig
} from "@modules/env"
import Decimal from "decimal.js"
import {
    AxiosService
} from "@modules/axios"
import {
    AxiosInstance
} from "axios"
import {
    createObjectId
} from "@modules/utils"
import {
    Collection 
} from "lokijs"
import {
    TurbosPool 
} from "./types"

/**
 * Service responsible for fetching and caching analytics data for Turbos DEX.
 * Uses the Turbos API to retrieve pool analytics information.
 */
@Injectable()
export class TurbosAnalyticsService
implements OnModuleInit, OnApplicationBootstrap {
    private readonly uri = "https://api2.turbos.finance/pools/ids"
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
    private axios: AxiosInstance
    constructor(
        private readonly axiosService: AxiosService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
        private readonly lokiJSService: LokiJSService,
        private readonly dayjsService: DayjsService,
    ) { }

    /**
     * Starts the analytics update interval on application bootstrap.
     */
    onApplicationBootstrap() {
        this.handleAnalyticsUpdateInterval()
    }

    /**
     * Initializes the analytics service by setting up collections and caches.
     */
    async onModuleInit() {
        const key = "turbos-analytics"
        this.axios = this.axiosService.create({
            key 
        })
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find(
                {
                    dex: {
                        $eq: createObjectId(DexId.Turbos).toString(),
                    },
                }
            )
            .data({
                removeMeta: true 
            })
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "turbos-analytics-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            })
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    /**
     * Sets the analytics data for a batch of liquidity pools.
     * @param liquidityPools - Array of liquidity pool schemas
     */
    private async setBatchPoolAnalytics(
        liquidityPools: Array<LiquidityPoolSchema>,
    ) {
        const baseURL = new URL(this.uri)
        for (const liquidityPool of liquidityPools) {
            baseURL.searchParams.append("ids[]",
                liquidityPool.poolAddress)
        }
        const { data } = await this.axios.get<Array<TurbosPool>>(baseURL.toString())
        const promises: Array<Promise<void>> = []
        const snapshotAt = this.dayjsService.now()
        for (const item of data) {
            promises.push(
                (async () => {
                    const liquidityPool = liquidityPools.find(
                        (liquidityPool) => liquidityPool.poolAddress === item.pool_id,
                    )
                    if (!liquidityPool || !liquidityPool.displayId) {
                        return
                    }
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        snapshotAt,
                        fee24H: new Decimal(item.fee_24h_usd).toString(),
                        volume24H: new Decimal(item.volume_24h_usd).toString(),
                        tvl: new Decimal(item.liquidity_usd).toString(),
                        apr24H: new Decimal(item.apr).div(item.apr_percent).toString(),
                        liquidity: new Decimal(item.liquidity_usd).toString(),
                    }
                    await this.cacheService.set(
                        {
                            key: CacheKey.PoolAnalytics,
                            args: [liquidityPool.id],
                            cacheResult: poolAnalyticsCacheResult,
                        }
                    )
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Handles the analytics update interval.
     * Splits pools into chunks and processes them in batches.
     */
    @Interval(envConfig().dexes.turbos.interval.analytics)
    async handleAnalyticsUpdateInterval() {
        // split into chunks of 10
        const chunks = this.liquidityPoolCollection.find().reduce(
            (acc: Array<Array<LiquidityPoolSchema>>, liquidityPool, index) => {
                const chunkIndex = new Decimal(index).div(10).floor().toNumber()
                acc[chunkIndex] = [...(acc[chunkIndex] || []),
                    liquidityPool]
                return acc
            },
            [] as Array<Array<LiquidityPoolSchema>>,
        )
        const promises: Array<Promise<void>> = []
        for (const chunk of chunks) {
            promises.push(
                this.setBatchPoolAnalytics(
                    chunk,
                ),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }
}
