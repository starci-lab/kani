import {
    DexId,
    LiquidityPoolId,
    LiquidityPoolSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import { TurbosPoolBatchInfoNotFoundException } from "@exceptions"
import {
    CacheKey,
    createCacheKey,
    InjectRedisCache,
    PoolAnalyticsCacheResult,
} from "@modules/cache"
import { Cache } from "cache-manager"
import { Interval } from "@nestjs/schedule"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"
import { AxiosService } from "@modules/axios"
import { AxiosInstance } from "axios"
import { createObjectId } from "@utils"
import SuperJSON from "superjson"
// Implement analytics for Turbos DEX
// We use the API provided by Turbos to get the analytics data
@Injectable()
export class TurbosAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private axios: AxiosInstance
    constructor(
    private readonly axiosService: AxiosService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    @InjectRedisCache()
    private readonly cacheManager: Cache,
    private readonly asyncService: AsyncService,
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
    ) {}

    async onApplicationBootstrap() {
        await this.handleAnalyticsUpdateInterval()
    }

    async onModuleInit() {
        const key = "turbos-analytics"
        this.axios = this.axiosService.create(key)
        this.axiosService.addRetry({ key })
    }

    private async setBatchPoolAnalytics(
        liquidityPoolIds: Array<LiquidityPoolId>,
    ) {
    // Get the liquidity pool
        const liquidityPools =
      this.primaryMemoryStorageService.liquidityPools.filter((liquidityPool) =>
          liquidityPoolIds.includes(liquidityPool.displayId),
      )
        if (!liquidityPools.length) {
            return
        }
        const baseURL = new URL("https://api2.turbos.finance/pools/ids")
        for (const liquidityPool of liquidityPools) {
            baseURL.searchParams.append("ids[]", liquidityPool.poolAddress)
        }
        const { data } = await this.axios.get<Array<TurbosPool>>(baseURL.toString())
        if (!data) {
            throw new TurbosPoolBatchInfoNotFoundException(
                liquidityPoolIds,
                "Pool batch info not found",
            )
        }
        const promises: Array<Promise<void>> = []
        for (const item of data) {
            promises.push(
                (async () => {
                    const liquidityPool = liquidityPools.find(
                        (liquidityPool) => liquidityPool.poolAddress === item.pool_id,
                    )
                    if (!liquidityPool || !liquidityPool.displayId) {
                        return
                    }
                    const poolAnalyticsCacheKey = createCacheKey(
                        CacheKey.PoolAnalytics,
                        liquidityPool.displayId
                    )
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: new Decimal(item.fee_24h_usd).toString(),
                        volume24H: new Decimal(item.volume_24h_usd).toString(),
                        tvl: new Decimal(item.liquidity_usd).toString(),
                        apr24H: new Decimal(item.apr).div(item.apr_percent).toString(),
                    }
                    await this.cacheManager.set(poolAnalyticsCacheKey, this.superjson.stringify(poolAnalyticsCacheResult), envConfig().cache.ttl.poolAnalytics)
                    console.log(poolAnalyticsCacheResult)
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

  @Interval(envConfig().interval.analytics)
    async handleAnalyticsUpdateInterval() {
        const liquidityPools =
      this.primaryMemoryStorageService.liquidityPools.filter(
          (liquidityPool) =>
              liquidityPool.dex.toString() ===
          createObjectId(DexId.Turbos).toString(),
      )
        // split into chunks of 10
        const chunks = liquidityPools.reduce(
            (acc: Array<Array<LiquidityPoolSchema>>, liquidityPool, index) => {
                const chunkIndex = new Decimal(index).div(10).floor().toNumber()
                acc[chunkIndex] = [...(acc[chunkIndex] || []), liquidityPool]
                return acc
            },
      [] as Array<Array<LiquidityPoolSchema>>,
        )
        const promises: Array<Promise<void>> = []
        for (const chunk of chunks) {
            promises.push(
                this.setBatchPoolAnalytics(
                    chunk.map((liquidityPool) => liquidityPool.displayId),
                ),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }
}

export interface TurbosObjectId {
  id: string
}
export interface TurbosRewardInfoFields {
  id: TurbosObjectId
  vault: string
  manager: string
  growth_global: string
  vault_coin_type: string
  emissions_per_second: string
}

export interface TurbosRewardInfo {
  id: TurbosObjectId
  vault: string
  manager: string
  growth_global: string
  vault_coin_type: string
  emissions_per_second: string
  fields?: TurbosRewardInfoFields // deprecated but still returned
}
export interface TurbosPool {
  id: number

  // raw liquidity values (on-chain, big number)
  coin_a: string
  coin_b: string
  liquidity: string
  max_liquidity_per_tick: string

  liquidity_24h_avg: string
  liquidity_7d_avg: string
  liquidity_30d_avg: string

  // fees
  fee: string
  fee_protocol: string
  fee_growth_global_a: string
  fee_growth_global_b: string
  protocol_fees_a: string
  protocol_fees_b: string

  // price & tick
  sqrt_price: string
  tick_current_index: number
  tick_spacing: string

  // pool meta
  pool_id: string
  type: string
  fee_type: string
  unlocked: boolean
  is_vault: boolean
  auto_collect: boolean
  flag: number
  category: "stable" | string | null

  // coin info
  coin_symbol_a: string
  coin_symbol_b: string
  coin_type_a: string
  coin_type_b: string

  // depth (seems reserved, often zero)
  add_2_percent_depth: string
  reduce_2_percent_depth: string

  // rewards
  reward_infos: Array<TurbosRewardInfo>
  reward_last_updated_time_ms: string

  // APR
  apr: number
  apr_7d: number
  apr_percent: number
  fee_apr: number
  reward_apr: number
  fee_7d_apr: number
  reward_7d_apr: number

  // volume
  volume_24h_usd: number
  volume_7d_usd: number
  volume_30d_usd: number

  // liquidity usd
  liquidity_usd: number
  coin_a_liquidity_usd: number
  coin_b_liquidity_usd: number

  // fees usd
  fee_24h_usd: number
  fee_7d_usd: number

  // misc
  deploy_time_ms: string
  ticks: Array<unknown>

  created_at: string
  updated_at: string
}