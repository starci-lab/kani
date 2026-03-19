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
    WinstonLog,
    WinstonService
} from "@modules/winston"
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
        private readonly winstonService: WinstonService,
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
                    const { fees, volume, rewards } = stats["24h"]
                    const fees24H = new Decimal(fees).div(tvlUsdc).mul(365)
                    const rewards24H = new Decimal(rewards ?? 0).div(tvlUsdc).mul(365)
                    const total24H = fees24H.add(rewards24H)
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: fees.toString(),
                        volume24H: volume.toString(),
                        tvl: tvlUsdc.toString(),
                        apr24H: {
                            fees: fees24H.toString(),
                            rewards: rewards24H.toString(),
                            total: total24H.toString(),
                        },
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

    @Interval(envConfig().dexes.orca.interval.analytics)
    async handleAnalyticsUpdateInterval() {
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
            await sleep(envConfig().dexes.orca.interval.analyticsRequestDelayMs)
        }
    }
}
