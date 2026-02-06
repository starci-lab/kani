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
    createObjectId 
} from "@modules/utils"
import {
    AsyncService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"
import {
    DayjsService, 
    LokiJSService
} from "@modules/mixin"
import {
    Collection 
} from "lokijs"
import {
    PoolAnalyticsResult
} from "./types"

/**
 * Service responsible for fetching and caching Meteora pool analytics data.
 * Uses Meteora API to retrieve pool statistics and metrics.
 *
 * @example
 * const service = new MeteoraAnalyticsService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class MeteoraAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private readonly url = "https://dlmm-api.meteora.ag/pair/all_by_groups"
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
    private axios: AxiosInstance
    constructor(
    private readonly axiosService: AxiosService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly cacheService: CacheService,
    private readonly asyncService: AsyncService,
    private readonly dayjsService: DayjsService,
    private readonly lokiJSService: LokiJSService,
    ) {}

    onApplicationBootstrap() {
        this.handleAnalyticsUpdateInterval()
    }

    async onModuleInit() {
        const key = "meteora-analytics"
        this.axios = this.axiosService.create({
            key 
        })
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.Meteora).toString(),
                },
            })
            .data({
                removeMeta: true 
            })
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "meteora-analytics-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "dex"],
            }
        )
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    private async setBatchPoolAnalytics(liquidityPools: Array<LiquidityPoolSchema>) {
        // Get the liquidity pool
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
                        await this.cacheService.set(
                            {
                                key: CacheKey.PoolAnalytics,
                                args: [liquidityPool.id],
                                cacheResult: {
                                    fee24H: new Decimal(pair.fees_24h).toString(),
                                    volume24H: new Decimal(pair.trade_volume_24h).toString(),
                                    tvl: new Decimal(pair.liquidity).toString(),
                                    apr24H: new Decimal(pair.apr).div(100).toString(),
                                    snapshotAt,
                                    liquidity: new Decimal(pair.liquidity).toString(),
                                },
                            }
                        )
                    })(),
                )
            }
        }  
        await this.asyncService.allIgnoreError(promises)
    }
    
    @Interval(envConfig().dexes.meteora.interval.analytics)
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

  