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
    CacheService
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
    PoolAnalyticsResult
} from "./types"
import Decimal from "decimal.js"

/**
 * Fetches and caches Meteora pool analytics (fees, volume, TVL, APR) from Meteora API.
 *
 * @example
 * await meteoraAnalyticsService.onModuleInit()
 * // then handleAnalyticsUpdateInterval runs on schedule
 */
@Injectable()
export class MeteoraAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private readonly url = "https://dlmm.datapi.meteora.ag/pools"
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
     * Initializes Meteora analytics: wait for primary memory storage, create axios client, build local pool map.
     */
    async onModuleInit(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        const key = "meteora-analytics"
        this.axios = this.axiosService.create({
            key
        })
        const liquidityPools = Array.from(
            this.primaryMemoryStorageService.liquidityPoolMap.values())
            .filter(
                (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.Meteora).toString(),
            )
        this.liquidityPoolMap = new Map(
            liquidityPools.map((liquidityPool) => [
                liquidityPool.id,
                liquidityPool
            ]
            )
        )
    }

    /**
     * Fetches analytics for a batch of pools from Meteora API and writes to cache.
     *
     * @param liquidityPools - Pools to fetch analytics for
     */
    private async setBatchPoolAnalytics(liquidityPools: Array<LiquidityPoolSchema>): Promise<void> {
        const baseURL = new URL(this.url)
        baseURL.searchParams.append("filter_by",
            `pool_address=[${liquidityPools.map(liquidityPool => liquidityPool.poolAddress).join("|")}]`
        )
        const { data } = await this.axios.get<PoolAnalyticsResult>(baseURL.toString())
        const promises: Array<Promise<void>> = []
        const snapshotAt = this.dayjsService.now()
        for (const pool of data.data) {
            promises.push(
                (async () => {
                    try {
                        const liquidityPool = liquidityPools.find(
                            (liquidityPool) => liquidityPool.poolAddress === pool.address,
                        )
                        if (!liquidityPool || !liquidityPool.displayId) {
                            return
                        }
                        const fee24H = pool.fees["24h"] ?? 0
                        const volume24H = pool.volume["24h"] ?? 0
                        const apr24H = new Decimal(pool.apr).mul(365).div(100)
                        const farmApr24H = new Decimal(pool.farm_apr).mul(365).div(100) 
                        const totalApr24H = apr24H.add(farmApr24H)
                        const poolAnalyticsCacheResult = {
                            fee24H: fee24H.toString(),
                            volume24H: volume24H.toString(),
                            tvl: pool.tvl.toString(),
                            apr24H: {
                                fees: apr24H.toString(),
                                rewards: farmApr24H.toString(),
                                total: totalApr24H.toString(),
                            },
                            snapshotAt,
                            liquidity: pool.tvl.toString(),
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
                    } catch (error) {
                        console.error(error)
                        throw error
                    }
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Runs on interval: chunks pools by 10, fetches and caches analytics per chunk.
     */
    @Interval(envConfig().dexes.meteora.interval.analytics)
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
            await sleep(envConfig().dexes.meteora.interval.analyticsRequestDelayMs)
        }
    }
}

