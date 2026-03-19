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
    CacheKey,
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
    PoolResult
} from "./types"
import {
    Decimal
} from "decimal.js"

/**
 * Fetches and caches Raydium pool analytics (fees, volume, TVL, APR) from Raydium API.
 *
 * @example
 * await raydiumAnalyticsService.onModuleInit()
 * // then handleAnalyticsUpdateInterval runs on schedule
 */
@Injectable()
export class RaydiumAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private url = "https://api-v3.raydium.io/pools/info/ids"
    private axios: AxiosInstance
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()

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
     * Initializes Raydium analytics: wait for primary memory storage, create axios client, build local pool map.
     */
    async onModuleInit(): Promise<void> {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        // create axios instance for Raydium API
        const key = "raydium-analytics"
        this.axios = this.axiosService.create({
            key
        })
        // fetch all Raydium liquidity pools from primary memory storage
        const liquidityPools = Array.from(
            this.primaryMemoryStorageService.liquidityPoolMap.values())
            .filter(
                (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Raydium).toString(),
            )
        // create local map snapshot for efficient processing
        this.liquidityPoolMap = new Map(
            liquidityPools.map((liquidityPool) => [liquidityPool.id,
                liquidityPool
            ])
        )
    }

    /**
     * Sets the analytics data for a batch of liquidity pools.
     * @param liquidityPools - Array of liquidity pool schemas
     */
    private async setBatchPoolAnalytics(
        liquidityPools: Array<LiquidityPoolSchema>,
    ) {
        const poolAddresses = liquidityPools
            .map((pool) => pool.poolAddress)
            .join(",")
        const { data } = await this.axios.get<PoolResult>(
            `${this.url}?ids=${poolAddresses}`,
        )
        const snapshotAt = this.dayjsService.now()
        const promises: Array<Promise<void>> = []
        for (const poolData of data.data) {
            promises.push(
                (async () => {
                    const liquidityPool = liquidityPools.find(
                        (pool) => pool.poolAddress === poolData.id,
                    )
                    if (!liquidityPool || !liquidityPool.displayId) {
                        return
                    }
                    const { tvl, day } = poolData
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: day.volume.toString(),
                        volume24H: day.volumeQuote.toString(),
                        tvl: tvl.toString(),
                        apr24H: {
                            fees: new Decimal(day.feeApr).div(100).toString(),
                            rewards: new Decimal(
                                day.rewardApr.reduce(
                                    (acc, curr) => acc + curr,
                                    0)
                            ).div(100).toString(),
                            total: new Decimal(day.apr).div(100).toString(),
                        },
                        snapshotAt,
                        liquidity: tvl.toString(),
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
    @Interval(envConfig().dexes.raydium.interval.analytics)
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
            await sleep(envConfig().dexes.raydium.interval.analyticsRequestDelayMs)
        }
    }
}
