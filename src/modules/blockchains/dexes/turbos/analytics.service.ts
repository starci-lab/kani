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
    createObjectId,
    sleep
} from "@modules/common"
import {
    AsyncService, 
    DayjsService, 
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
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    TurbosPool
} from "./types"
import Decimal from "decimal.js"

/**
 * Fetches and caches Turbos pool analytics (fees, volume, TVL, APR) from Turbos API.
 *
 * @example
 * await turbosAnalyticsService.onModuleInit()
 * // then handleAnalyticsUpdateInterval runs on schedule
 */
@Injectable()
export class TurbosAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private readonly uri = "https://api2.turbos.finance/pools/ids"
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()
    private axios: AxiosInstance

    constructor(
        private readonly axiosService: AxiosService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly winstonService: WinstonService,
    ) { }

    /**
     * Starts the analytics update interval on application bootstrap.
     */
    onApplicationBootstrap(): void {
        this.handleAnalyticsUpdateInterval()
    }

    /**
     * Initializes Turbos analytics: wait for primary memory storage, create axios client, build local pool map.
     */
    async onModuleInit(): Promise<void> {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        // create axios instance for Turbos API
        const key = "turbos-analytics"
        this.axios = this.axiosService.create({
            key 
        })
        // fetch all Turbos liquidity pools from primary memory storage
        const liquidityPools = Array.from(
            this.primaryMemoryStorageService.liquidityPoolMap.values())
            .filter(
                (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Turbos).toString(),
            )
        // create local map snapshot for efficient processing
        this.liquidityPoolMap = new Map(
            liquidityPools.map((liquidityPool) => [liquidityPool.id,
                liquidityPool
            ]
            )
        )
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
                        fee24H: item.fee_24h_usd.toString(),
                        volume24H: item.volume_24h_usd.toString(),
                        tvl: item.liquidity_usd.toString(),
                        apr24H: {
                            fees: new Decimal(item.fee_apr).div(100).toString(),
                            rewards: new Decimal(item.reward_apr).div(100).toString(),
                            total: new Decimal(item.apr).div(100).toString(),
                        },
                        liquidity: item.liquidity_usd.toString(),
                    }
                    await this.cacheService.set(
                        {
                            key: CacheKey.PoolAnalytics,
                            args: [liquidityPool.id],
                            cacheResult: poolAnalyticsCacheResult,
                        }
                    )
                    this.winstonService.log(
                        WinstonLog.PoolAnalyticsUpdated,
                        {
                            liquidityPoolId: liquidityPool.displayId,
                        }
                    )
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Runs on interval: chunks pools by 10, fetches and caches analytics per chunk.
     */
    @Interval(envConfig().dexes.turbos.interval.analytics)
    async handleAnalyticsUpdateInterval(): Promise<void> {
        const chunks = Array.from(this.liquidityPoolMap.values()).reduce(
            (acc: Array<Array<LiquidityPoolSchema>>, liquidityPool, index) => {
                const chunkIndex = Math.floor(index / 10)
                acc[chunkIndex] = [...(acc[chunkIndex] || []),
                    liquidityPool]
                return acc
            },
            [] as Array<Array<LiquidityPoolSchema>>,
        )
        for (const chunk of chunks) {
            await this.asyncService.safeRun(
                async () => {
                    await this.setBatchPoolAnalytics(chunk)
                }
            )
            await sleep(envConfig().dexes.turbos.interval.analyticsRequestDelayMs)
        }
    }
}
