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
    WhirlpoolPoolResult
} from "./types"

/**
 * Service responsible for fetching and caching Orca pool analytics data.
 * Uses Orca API to retrieve pool statistics and metrics.
 *
 * @example
 * const service = new OrcaAnalyticsService(...)
 * await service.onModuleInit()
 */
@Injectable()
export class OrcaAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private readonly url = "https://api.orca.so/v2/solana/pools"
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

    async onApplicationBootstrap() {
        await this.handleAnalyticsUpdateInterval()
    }

    async onModuleInit() {
        const key = "orca-analytics"
        this.axios = this.axiosService.create({ key })
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.Orca).toString(),
                },
            })
            .data({
                removeMeta: true 
            })
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "orca-analytics-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            })
        this.liquidityPoolCollection.insert(liquidityPools)
    }

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
                        fee24H: new Decimal(fees).toString(),
                        volume24H: new Decimal(volume).toString(),
                        tvl: new Decimal(tvlUsdc).toString(),
                        apr24H: new Decimal(yieldOverTvl).mul(365).toString(),
                        snapshotAt,
                        liquidity: new Decimal(liquidity).toString(),
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
