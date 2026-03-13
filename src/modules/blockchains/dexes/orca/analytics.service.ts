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
    CacheKey, 
    PoolAnalyticsCacheResult,
    CacheService,
} from "@modules/cache"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/common"
import {
    AsyncService, DayjsService, ReadinessWatcherFactoryService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    WhirlpoolPoolResult
} from "./types"
import {
    Decimal 
} from "decimal.js"

/**
 * Fetches and caches Orca pool analytics (fees, volume, TVL, APR) from Orca API.
 *
 * @example
 * await orcaAnalyticsService.onModuleInit()
 * // then handleAnalyticsUpdateInterval runs on schedule
 */
@Injectable()
export class OrcaAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private readonly url = "https://api.orca.so/v2/solana/pools"
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()
    private axios: AxiosInstance

    constructor(
    private readonly axiosService: AxiosService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly cacheService: CacheService,
    private readonly asyncService: AsyncService,
    private readonly dayjsService: DayjsService,
    private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    /**
     * Called once the application has bootstrapped.
     * Initiates periodic analytics updates.
     */
    async onApplicationBootstrap() {
        await this.handleAnalyticsUpdateInterval()
    }
    
    /**
     * Initializes the analytics service by setting up collections and caches.
     */
    async onModuleInit() {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        const key = "orca-analytics"
        this.axios = this.axiosService.create({
            key 
        })
        const liquidityPools = Array.from(
            this.primaryMemoryStorageService.liquidityPoolMap.values())
            .filter(
                (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Orca).toString(),
            )
        this.liquidityPoolMap = new Map(
            liquidityPools.map((liquidityPool) => [liquidityPool.id,
                liquidityPool
            ]))
    }

    /**
     * Sets the analytics data for a batch of liquidity pools.
     * @param liquidityPools - Array of liquidity pool schemas
     */
    private async setBatchPoolAnalytics(liquidityPools: Array<LiquidityPoolSchema>) {
        const poolAddresses = liquidityPools.map(liquidityPool => liquidityPool.poolAddress).join(",")
        const { data } = await this.axios.get<WhirlpoolPoolResult>(
            `${this.url}?addresses=${poolAddresses}`,
        )
        const snapshotAt = this.dayjsService.now()
        const promises: Array<Promise<void>> = []
        for (const item of data.data) {
            promises.push(
                (async () => {
                    const liquidityPool = liquidityPools.find(
                        (pool) => pool.poolAddress === item.address,
                    )
                    if (!liquidityPool || !liquidityPool.displayId) {
                        return
                    }
                    const { stats, tvlUsdc, liquidity } = item
                    const { fees, volume, yieldOverTvl } = stats["24h"]
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: fees.toString(),
                        volume24H: volume.toString(),
                        tvl: tvlUsdc.toString(),
                        apr24H: new Decimal(yieldOverTvl).mul(365).toString(),
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

    @Interval(envConfig().dexes.orca.interval.analytics)
    async handleAnalyticsUpdateInterval() {
        // split into chunks of 10
        const chunks = Array.from(this.liquidityPoolMap.values()).reduce(
            (acc: Array<Array<LiquidityPoolSchema>>, liquidityPool, index) => {
                const chunkIndex = Math.floor(index / 10)
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
