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
    CacheService,
    PoolAnalyticsCacheResult,
} from "@modules/cache"
import {
    Interval 
} from "@nestjs/schedule"
import {
    AsyncService, DayjsService 
} from "@modules/mixin"
import {
    ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    AxiosService 
} from "@modules/axios"
import {
    AxiosInstance 
} from "axios"
import {
    createObjectId 
} from "@modules/common"
import {
    LiquidityPoolsApiResult
} from "./types"
import {
    Decimal 
} from "decimal.js"

/**
 * Fetches and caches Momentum pool analytics (fees, volume, TVL, APR) from Momentum API.
 *
 * @example
 * await momentumAnalyticsService.onModuleInit()
 * // then handleAnalyticsUpdateInterval runs on schedule
 */
@Injectable()
export class MomentumAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private readonly url = "https://api.mmt.finance/pools/v3"
    private axios: AxiosInstance
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()

    constructor(
    private readonly axiosService: AxiosService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly cacheService: CacheService,
    private readonly asyncService: AsyncService,
    private readonly dayjsService: DayjsService,
    private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    /**
     * Starts the analytics update interval on application bootstrap.
     */
    onApplicationBootstrap(): void {
        this.handleAnalyticsUpdateInterval()
    }

    /**
     * Initializes Momentum analytics: wait for primary memory storage, create axios client, build local pool map.
     */
    async onModuleInit(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        const key = "momentum-analytics"
        this.axios = this.axiosService.create({
            key 
        })
        const liquidityPools = Array.from(
            this.primaryMemoryStorageService.liquidityPoolMap.values())
            .filter(
                (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Momentum).toString(),
            )
        this.liquidityPoolMap = new Map(
            liquidityPools.map((liquidityPool) => [liquidityPool.id,
                liquidityPool
            ]
            )
        )
    }

    /**
     * Fetches all pool analytics from Momentum API and writes to cache.
     */
    private async setAllPoolAnalytics(): Promise<void> {
        const { data } = await this.axios.get<LiquidityPoolsApiResult>(
            this.url,
        )
        const snapshotAt = this.dayjsService.now()
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of Array.from(this.liquidityPoolMap.values())) {
            promises.push(
                (async () => {
                    const pool = data.data.find(
                        (pool) => pool.poolId === liquidityPool.poolAddress,
                    )
                    if (!pool) {
                        return
                    }
                    const {
                        fees24h,
                        aprBreakdown: { total },
                        volume24h,
                        tvl,
                        liquidity,
                    } = pool
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: fees24h.toString(),
                        volume24H: volume24h.toString(),
                        tvl: tvl.toString(),
                        apr24H: new Decimal(total).div(365).div(100).toString(),
                        snapshotAt,
                        liquidity: liquidity.toString(),
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
     * Runs on interval: fetches and caches analytics for all pools.
     */
    @Interval(envConfig().dexes.momentum.interval.analytics)
    async handleAnalyticsUpdateInterval(): Promise<void> {
        const promises: Array<Promise<void>> = []
        promises.push(this.setAllPoolAnalytics())
        await this.asyncService.allIgnoreError(promises)
    }
}

