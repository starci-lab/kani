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
} from "@utils"
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

// Implement analytics for Orca DEX
// We use the API provided by Orca to get the analytics data
@Injectable()
export class OrcaAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
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
        this.axios = this.axiosService.create(key)
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection.find(
            {
                dex: {
                    $eq: createObjectId(DexId.Orca),
                },
            }
        )
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
                    const { stats, tvlUsdc } = item
                    const { fees, volume, yieldOverTvl } = stats["24h"]
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: new Decimal(fees).toString(),
                        volume24H: new Decimal(volume).toString(),
                        tvl: new Decimal(tvlUsdc).toString(),
                        apr24H: new Decimal(yieldOverTvl).mul(365).toString(),
                        snapshotAt: this.dayjsService.now(),
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
        const chunks = this.liquidityPoolCollection.chain().data().reduce(
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

export interface WhirlpoolPoolResult {
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