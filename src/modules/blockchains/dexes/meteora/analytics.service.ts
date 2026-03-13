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
    JitterService,
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
import {
    Decimal
} from "decimal.js"

/**
 * Fetches and caches Meteora pool analytics (fees, volume, TVL, APR) from Meteora API.
 *
 * @example
 * await meteoraAnalyticsService.onModuleInit()
 * // then handleAnalyticsUpdateInterval runs on schedule
 */
@Injectable()
export class MeteoraAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private readonly url = "https://dlmm-api.meteora.ag/pair/all_by_groups"
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()
    private axios: AxiosInstance

    constructor(
        private readonly axiosService: AxiosService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly jitterService: JitterService,
        private readonly winstonService: WinstonService,
    ) {}

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
            liquidityPools.map((liquidityPool) => [liquidityPool.id,
                liquidityPool
            ]
            ))
    }

    /**
     * Fetches analytics for a batch of pools from Meteora API and writes to cache.
     *
     * @param liquidityPools - Pools to fetch analytics for
     */
    private async setBatchPoolAnalytics(liquidityPools: Array<LiquidityPoolSchema>): Promise<void> {
        const baseURL = new URL(this.url)
        for (const liquidityPool of liquidityPools) {
            baseURL.searchParams.append("include_pool_token_pairs",
                liquidityPool.displayId)
        }
        const { data } = await this.axios.get<PoolAnalyticsResult>(baseURL.toString())
        const promises: Array<Promise<void>> = []
        const snapshotAt = this.dayjsService.now()
        for (const group of data.groups) {
            for (const pair of group.pairs) {
                promises.push(
                    (async () => {
                        const liquidityPool = liquidityPools.find(
                            (liquidityPool) => liquidityPool.poolAddress === pair.address,
                        )
                        if (!liquidityPool || !liquidityPool.displayId) {
                            return
                        }
                        const poolAnalyticsCacheResult = {
                            fee24H: pair.fees_24h.toString(),
                            volume24H: pair.trade_volume_24h.toString(),
                            tvl: pair.liquidity.toString(),
                            apr24H: new Decimal(pair.apr).div(100).toString(),
                            snapshotAt,
                            liquidity: pair.liquidity.toString(),
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
        }  
        await this.asyncService.allIgnoreError(promises)
    }
    
    /**
     * Runs on interval: chunks pools by 10, fetches and caches analytics per chunk.
     */
    @Interval(envConfig().dexes.meteora.interval.analytics)
    async handleAnalyticsUpdateInterval(): Promise<void> {
        await this.jitterService.delayWithJitter(
            envConfig().dexes.meteora.interval.analytics
        )
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

  