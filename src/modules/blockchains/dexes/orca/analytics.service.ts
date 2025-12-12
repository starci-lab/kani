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

// Implement analytics for Orca DEX
// We use the API provided by Orca to get the analytics data
@Injectable()
export class OrcaAnalyticsService
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
        const key = "orca-analytics"
        this.axios = this.axiosService.create(key)
        this.axiosService.addRetry({ key })
    }

    private async setBatchPoolAnalytics(liquidityPoolIds: Array<LiquidityPoolId>) {
        // Get the liquidity pool
        const liquidityPools = this.primaryMemoryStorageService.liquidityPools.filter(
            (liquidityPool) => liquidityPoolIds.includes(liquidityPool.displayId),
        )
        if (!liquidityPools.length) {
            return
        }
        const poolAddresses = liquidityPools.map((liquidityPool) => liquidityPool.poolAddress).join(",")
        const { data } = await this.axios.get<WhirlpoolPoolResponse>(
            `https://api.orca.so/v2/solana/pools?addresses=${poolAddresses}`,
        )
        const cacheEntries: Array<CacheEntry> = []
        for (const item of data.data) {
            const liquidityPool = liquidityPools.find(
                (pool) => pool.poolAddress === item.address,
            )
            if (!liquidityPool) {
                continue
            }
            const { stats, tvlUsdc } = item
            const { fees, volume, yieldOverTvl } = stats["24h"]
            cacheEntries.push({
                key: createCacheKey(CacheKey.Fee24H, liquidityPool.displayId),
                value: new Decimal(fees).toString(),
                ttl: envConfig().cache.ttl.poolAnalytics,
            })
            cacheEntries.push({
                key: createCacheKey(CacheKey.Volume24H, liquidityPool.displayId),
                value: new Decimal(volume).toString(),
                ttl: envConfig().cache.ttl.poolAnalytics,
            })
            cacheEntries.push({
                key: createCacheKey(CacheKey.Liquidity, liquidityPool.displayId),
                value: new Decimal(tvlUsdc).toString(),
                ttl: envConfig().cache.ttl.poolAnalytics,
            })
            cacheEntries.push({
                key: createCacheKey(CacheKey.APR24H, liquidityPool.displayId),
                value: new Decimal(yieldOverTvl).toString(),
                ttl: envConfig().cache.ttl.poolAnalytics,
            })
        }
        await this.cacheManager.mset(cacheEntries)
    }

  @Interval(envConfig().interval.analytics)
    async handleAnalyticsUpdateInterval() {
        const liquidityPools =
        this.primaryMemoryStorageService.liquidityPools.filter(
            (liquidityPool) =>
                liquidityPool.dex.toString() ===
            createObjectId(DexId.Orca).toString(),
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

export interface WhirlpoolPoolResponse {
    data: Array<WhirlpoolPool>
  }
  
export interface WhirlpoolPool {
    address: string
    whirlpoolsConfig: string
    whirlpoolBump: Array<number>
    tickSpacing: number
    tickSpacingSeed: Array<number>
    feeRate: number
    protocolFeeRate: number
    liquidity: string
    sqrtPrice: string
    tickCurrentIndex: number
    protocolFeeOwedA: string
    protocolFeeOwedB: string
    tokenMintA: string
    tokenVaultA: string
    feeGrowthGlobalA: string
    tokenMintB: string
    tokenVaultB: string
    feeGrowthGlobalB: string
    rewardLastUpdatedTimestamp: string
    updatedAt: string
    updatedSlot: number
    writeVersion: number
    hasWarning: boolean
    poolType: string
    tokenA: TokenA
    tokenB: TokenB
    price: string
    tvlUsdc: string
    yieldOverTvl: string
    tokenBalanceA: string
    tokenBalanceB: string
    stats: Stats
    rewards: Array<Reward>
    addressLookupTable: string
    feeTierIndex: number
    adaptiveFeeEnabled: boolean
    tradeEnableTimestamp: string
  }
  
export interface TokenA {
    address: string
    programId: string
    imageUrl: string
    name: string
    symbol: string
    decimals: number
  }
  
export interface TokenB {
    address: string
    programId: string
    imageUrl: string
    name: string
    symbol: string
    decimals: number
  }
  
export interface Stats {
    "24h": Stats24h
    "7d": Stats7d
    "30d": Stats30d
  }
  
export interface Stats24h {
    volume: string
    fees: string
    rewards?: string
    yieldOverTvl: string
  }
  
export interface Stats7d {
    volume: string
    fees: string
    rewards?: string
    yieldOverTvl: string
  }
  
export interface Stats30d {
    volume: string
    fees: string
    rewards?: string
    yieldOverTvl: string
  }
  
export interface Reward {
    mint: string
    vault: string
    authority: string
    emissions_per_second_x64: string
    growth_global_x64: string
    active: boolean
    emissionsPerSecond: string
}