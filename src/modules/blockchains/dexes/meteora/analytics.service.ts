import { AxiosService } from "@modules/axios"
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
import { AxiosInstance } from "axios"
import { CacheEntry, CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { Interval } from "@nestjs/schedule"
import { createObjectId } from "@utils"
import { AsyncService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"

// Implement analytics for Meteora DEX
// We use the API provided by Meteora to get the analytics data
@Injectable()
export class MeteoraAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private axios: AxiosInstance
    constructor(
    private readonly axiosService: AxiosService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    @InjectRedisCache()
    private readonly cacheManager: Cache,
    private readonly asyncService: AsyncService,
    ) {}

    async onApplicationBootstrap() {
        await this.handleAnalyticsUpdateInterval()
    }

    async onModuleInit() {
        const key = "meteora-analytics"
        this.axios = this.axiosService.create(key)
        this.axiosService.addRetry({ key })
    }

    private async setBatchPoolAnalytics(liquidityPoolIds: Array<LiquidityPoolId>) {
        // Get the liquidity pool
        const liquidityPools = this.primaryMemoryStorageService.liquidityPools.filter(
            (liquidityPool) => liquidityPoolIds.includes(liquidityPool.displayId)
        )
        if (!liquidityPools.length) {
            return
        }
        const baseURL = new URL("https://dlmm-api.meteora.ag/pair/all_by_groups")
        for (const liquidityPool of liquidityPools) {
            baseURL.searchParams.append("include_pool_token_pairs", liquidityPool.poolAddress)
        }
        const { data } = await this.axios.get<PoolAnalyticsResponse>(baseURL.toString())
        const cacheEntries: Array<CacheEntry> = []
        for (const group of data.groups) {
            for (const pair of group.pairs) {
                cacheEntries.push({
                    key: createCacheKey(CacheKey.Fee24H, pair.address),
                    value: new Decimal(pair.fees_24h).toString(),
                    ttl: envConfig().cache.ttl.poolAnalytics,
                })
                cacheEntries.push({
                    key: createCacheKey(CacheKey.Volume24H, pair.address),
                    value: new Decimal(pair.trade_volume_24h).toString(),
                    ttl: envConfig().cache.ttl.poolAnalytics,
                })
                cacheEntries.push({
                    key: createCacheKey(CacheKey.Liquidity, pair.address),
                    value: new Decimal(pair.liquidity).toString(),
                    ttl: envConfig().cache.ttl.poolAnalytics,
                })
                cacheEntries.push({
                    key: createCacheKey(CacheKey.APR24H, pair.address),
                    value: new Decimal(pair.apr).div(100).toString(),
                    ttl: envConfig().cache.ttl.poolAnalytics,
                })
            }
        }
        await this.cacheManager.mset(cacheEntries)
    }

  @Interval(envConfig().interval.analytics)
    async handleAnalyticsUpdateInterval() {
        const liquidityPools =
        this.primaryMemoryStorageService.liquidityPools.filter(
            (liquidityPool) =>
                liquidityPool.dex.toString() ===
            createObjectId(DexId.Meteora).toString(),
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

export interface PoolAnalyticsResponse   {
    groups: Array<Group>
    total: number
  }
  
export interface Group {
    name: string
    pairs: Array<Pair>
  }
  
export interface Pair {
    address: string
    name: string
    mint_x: string
    mint_y: string
    reserve_x: string
    reserve_y: string
    reserve_x_amount: number
    reserve_y_amount: number
    bin_step: number
    base_fee_percentage: string
    max_fee_percentage: string
    protocol_fee_percentage: string
    liquidity: string
    reward_mint_x: string
    reward_mint_y: string
    fees_24h: number
    today_fees: number
    trade_volume_24h: number
    cumulative_trade_volume: string
    cumulative_fee_volume: string
    current_price: number
    apr: number
    apy: number
    farm_apr: number
    farm_apy: number
    hide: boolean
    is_blacklisted: boolean
    fees: Fees
    fee_tvl_ratio: FeeTvlRatio
    volume: Volume
    is_verified: boolean
  }
  
export interface Fees {
    min_30: number
    hour_1: number
    hour_2: number
    hour_4: number
    hour_12: number
    hour_24: number
  }
  
export interface FeeTvlRatio {
    min_30: number
    hour_1: number
    hour_2: number
    hour_4: number
    hour_12: number
    hour_24: number
  }
  
export interface Volume {
    min_30: number
    hour_1: number
    hour_2: number
    hour_4: number
    hour_12: number
    hour_24: number
  }
  