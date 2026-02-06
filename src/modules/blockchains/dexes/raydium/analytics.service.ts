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
    createObjectId 
} from "@modules/utils"
import {
    AsyncService, DayjsService, LokiJSService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"
import {
    Collection 
} from "lokijs"
import {
    PoolResult
} from "./types"

/**
 * Service responsible for fetching and caching Raydium pool analytics data.
 * Uses Raydium API to retrieve pool statistics and metrics.
 *
 * @example
 * const service = new RaydiumAnalyticsService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class RaydiumAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private url = "https://api-v3.raydium.io/pools/info/ids"
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

    onApplicationBootstrap() {
        this.handleAnalyticsUpdateInterval()
    }

    async onModuleInit() {
        const key = "raydium-analytics"
        this.axios = this.axiosService.create({ key })
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.Raydium).toString(),
                },
            })
            .data({
                removeMeta: true 
            })
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "raydium-analytics-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            })
        this.liquidityPoolCollection.insert(liquidityPools)
    }

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
                        fee24H: new Decimal(day.volume).toString(),
                        volume24H: new Decimal(day.volumeQuote).toString(),
                        tvl: new Decimal(tvl).toString(),
                        apr24H: new Decimal(day.apr).div(365).div(100).toString(),
                        snapshotAt,
                        liquidity: new Decimal(tvl).toString(),
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
            await this.asyncService.allIgnoreError(promises)
        }
    }
  @Interval(envConfig().dexes.raydium.interval.analytics)
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
