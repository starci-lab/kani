import {
    AxiosService 
} from "@modules/axios"
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
    AxiosInstance 
} from "axios"
import {
    PoolAnalyticsCacheResult,
    CacheService,
    CacheKey,
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
    JitterService,
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    CetusPoolListResult
} from "./types"
import {
    ReadinessWatcherFactoryService
} from "@modules/mixin"

/**
 * Service responsible for fetching and caching Cetus DEX analytics data.
 * Uses the Cetus API to retrieve pool statistics and updates cache periodically.
 *
 * @example
 * const service = new CetusAnalyticsService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class CetusAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    /** Cetus API URI. */
    private readonly uri = "https://api-sui.cetus.zone/v3/sui/clmm/stats_pools"
    /** Axios instance. */
    private axios: AxiosInstance
    /** Liquidity pool map. */
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()

    constructor(
        private readonly axiosService: AxiosService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly jitterService: JitterService,
    ) {}

    /**
     * Starts the analytics update interval on application bootstrap.
     */
    onApplicationBootstrap(): void {
        this.handleAnalyticsUpdateInterval()
    }

    /**
     * Initializes Cetus analytics: wait for primary memory storage, create axios client, build local pool map.
     */
    async onModuleInit(): Promise<void> {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(
            PrimaryMemoryStorageService.name
        )
        // create axios instance for Cetus API
        const key = "cetus-analytics"
        this.axios = this.axiosService.create({
            key 
        })
        // fetch all Cetus liquidity pools from primary memory storage
        const liquidityPools = Array.from(
            this.primaryMemoryStorageService.liquidityPoolMap.values())
            .filter(
                (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Cetus).toString(),
            )
        
        // create local map for analytics processing
        this.liquidityPoolMap = new Map(
            liquidityPools.map(
                (liquidityPool) => [liquidityPool.id,
                    liquidityPool
                ]
            )
        )
    }

    /**
     * Fetches and caches analytics data for a batch of liquidity pools.
     *
     * @param param - Parameters for setting batch pool analytics
     * @param param.liquidityPools - Array of liquidity pools to process
     */
    private async setBatchPoolAnalytics(
        liquidityPools: Array<LiquidityPoolSchema>
    ): Promise<void> {
        // skip if no pools to process
        if (!liquidityPools.length) {
            return
        }
        // fetch pool analytics from Cetus API
        const { data: { data: { list } } } = await this.axios.post<CetusPoolListResult>(
            this.uri,
            {
                filter: "all",
                sortBy: "vol",
                sortOrder: "asc",
                limit: 100,
                offset: 0,
                coinTypes: [],
                pools: liquidityPools.map((liquidityPool) => liquidityPool.poolAddress),
            },
        )
        
        // process each pool result and cache analytics
        const promises: Array<Promise<void>> = []
        const snapshotAt = this.dayjsService.now()
        
        for (const item of list) {
            promises.push(
                (async () => {
                    // find matching liquidity pool
                    const liquidityPool = liquidityPools.find(
                        (liquidityPool) => liquidityPool.poolAddress === item.pool,
                    )
                    
                    // skip if pool not found or missing display ID
                    if (!liquidityPool || !liquidityPool.displayId) {
                        return
                    }
                    
                    // extract analytics data from API response
                    const { tvl, totalApr: apr } = item
                    const { fee, vol } = item.stats[0]
                    
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: fee.toString(),
                        volume24H: vol.toString(),
                        tvl: tvl.toString(),
                        apr24H: apr.toString(),
                        snapshotAt,
                        liquidity: tvl.toString(),
                    }
                    
                    // cache analytics result
                    await this.cacheService.set({
                        key: CacheKey.PoolAnalytics,
                        args: [liquidityPool.id],
                        cacheResult: poolAnalyticsCacheResult,
                    })
                })(),
            )
        }
        
        // wait for all cache operations to complete
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Handles periodic analytics updates.
     * Splits pools into chunks and processes them in batches.
     */
    @Interval(envConfig().dexes.cetus.interval.analytics)
    async handleAnalyticsUpdateInterval(): Promise<void> {
        // add jitter to the interval
        await this.jitterService.delayWithJitter(
            envConfig().dexes.cetus.interval.analytics
        )
        // split pools into chunks of 10 for batch processing
        const chunks = Array.from(this.liquidityPoolMap.values()).reduce(
            (acc: Array<Array<LiquidityPoolSchema>>, liquidityPool, index) => {
                const chunkIndex = Math.floor(index / 10)
                acc[chunkIndex] = [
                    ...(acc[chunkIndex] || []),
                    liquidityPool
                ]
                return acc
            }, 
            [],
        )
        // process each chunk sequentially with jitter
        for (const chunk of chunks) {
            // fetch analytics for chunk
            await this.asyncService.safeRun(
                async () => {
                    await this.setBatchPoolAnalytics(chunk)
                }
            )
            // add delay to the next chunk
            await sleep(envConfig().dexes.cetus.interval.analyticsRequestDelayMs)
        }
    }
}
