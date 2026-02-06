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
    createObjectId 
} from "@modules/common"
import {
    AsyncService,
    DayjsService,
    LokiJSService
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"
import {
    Collection 
} from "lokijs"
import {
    CetusPoolListResult
} from "./types"

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
    private readonly uri = "https://api-sui.cetus.zone/v3/sui/clmm/stats_pools"
    private axios: AxiosInstance
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
    constructor(
    private readonly axiosService: AxiosService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly cacheService: CacheService,

    private readonly asyncService: AsyncService,
    private readonly dayjsService: DayjsService,
    private readonly lokiJSService: LokiJSService,
    ) {}

    /**
     * Starts the analytics update interval on application bootstrap.
     */
    onApplicationBootstrap(): void {
        this.handleAnalyticsUpdateInterval()
    }

    /**
     * Initializes the service by creating axios instance and setting up liquidity pool collection.
     */
    async onModuleInit(): Promise<void> {
        // create axios instance for Cetus API
        const key = "cetus-analytics"
        this.axios = this.axiosService.create({
            key 
        })
        
        // fetch all Cetus liquidity pools from primary memory storage
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.Cetus).toString(),
                },
            })
            .data({
                removeMeta: true 
            })
        
        // create local collection for analytics processing
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>({
            name: "cetus-analytics-liquidity-pools",
            options: {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            },
        })
        
        // insert pools into local collection
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    /**
     * Fetches and caches analytics data for a batch of liquidity pools.
     *
     * @param param - Parameters for setting batch pool analytics
     * @param param.liquidityPools - Array of liquidity pools to process
     */
    private async setBatchPoolAnalytics({ liquidityPools }: { liquidityPools: Array<LiquidityPoolSchema> }): Promise<void> {
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
                    
                    // build cache result
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: new Decimal(fee).toString(),
                        volume24H: new Decimal(vol).toString(),
                        tvl: new Decimal(tvl).toString(),
                        apr24H: new Decimal(apr).toString(),
                        snapshotAt,
                        liquidity: new Decimal(tvl).toString(),
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
        // split pools into chunks of 10 for batch processing
        const chunks = this.liquidityPoolCollection.find().reduce(
            (acc: Array<Array<LiquidityPoolSchema>>, liquidityPool, index) => {
                const chunkIndex = new Decimal(index).div(10).floor().toNumber()
                acc[chunkIndex] = [
                    ...(acc[chunkIndex] || []),
                    liquidityPool
                ]
                return acc
            }, 
            [],
        )
        
        // process each chunk in parallel
        const promises: Array<Promise<void>> = []
        for (const chunk of chunks) {
            promises.push(
                this.setBatchPoolAnalytics({
                    liquidityPools: chunk,
                }),
            )
        }
        
        // wait for all batches to complete
        await this.asyncService.allIgnoreError(promises)
    }
}
