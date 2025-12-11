import { AxiosService } from "@modules/axios"
import {
    DexId,
    LiquidityPoolId,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import { AxiosInstance } from "axios"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { Interval } from "@nestjs/schedule"
import { createObjectId } from "@utils"
import { AsyncService, RandomDelayService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"

// Implement analytics for Meteora DEX
// We use the API provided by Meteora to get the analytics data
@Injectable()
export class RaydiumAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private axios: AxiosInstance
    constructor(
    private readonly axiosService: AxiosService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    @InjectRedisCache()
    private readonly cacheManager: Cache,
    private readonly asyncService: AsyncService,
    private readonly randomDelayService: RandomDelayService,
    ) {}

    async onApplicationBootstrap() {
        await this.handlePoolStateUpdateInterval()
    }

    async onModuleInit() {
        const key = "raydium-analytics"
        this.axios = this.axiosService.create(key)
        this.axiosService.addRetry({ key })
    }

    private async setPoolAnalytics(liquidityPoolId: LiquidityPoolId) {
        // Wait a random amount of time to avoid rate limiting
        await this.randomDelayService.waitRandom()
        // Get the liquidity pool
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            (liquidityPool) => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(
                liquidityPoolId,
                "Liquidity pool not found",
            )
        }
        console.log({
            liquidityPoolId,
            poolAddress: liquidityPool.poolAddress,
        })
        const { data } = await this.axios.get<PoolResponse>(
            `https://api-v3.raydium.io/pools/info/ids?ids=${liquidityPool.poolAddress}`,
        )
        const { tvl, day } = data.data[0]
        await this.cacheManager.mset([
            {
                key: createCacheKey(CacheKey.Fee24H, liquidityPoolId),
                value: new Decimal(day.volumeFee).toString(),
            },
            {
                key: createCacheKey(CacheKey.Volume24H, liquidityPoolId),
                value: new Decimal(day.volume).toString(),
            },
            {
                key: createCacheKey(CacheKey.Liquidity, liquidityPoolId),
                value: new Decimal(tvl).toString(),
            },
            {
                key: createCacheKey(CacheKey.APR24H, liquidityPoolId),
                value: new Decimal(day.apr).div(100).toString(),
            },
        ])
    }

  @Interval(envConfig().interval.analytics)
    async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.primaryMemoryStorageService
            .liquidityPools) {
            if (
                liquidityPool.dex.toString() !==
        createObjectId(DexId.Raydium).toString()
            )
                continue
            promises.push(this.setPoolAnalytics(liquidityPool.displayId))
        }
        await this.asyncService.allIgnoreError(promises)
    }
}

export interface PoolResponse {
    id: string;
    success: boolean;
    data: Array<RaydiumPool>;
  }
  
export interface RaydiumPool {
    type: string;
    programId: string;
    id: string;
    mintA: TokenInfo;
    mintB: TokenInfo;
    rewardDefaultPoolInfos: string;
    rewardDefaultInfos: Array<RewardInfo>;
    price: number;
    mintAmountA: number;
    mintAmountB: number;
    feeRate: number;
    openTime: string;
    tvl: number;
    day: PeriodStats;
    week: PeriodStats;
    month: PeriodStats;
    pooltype: Array<string>;
    farmUpcomingCount: number;
    farmOngoingCount: number;
    farmFinishedCount: number;
    config: PoolConfig;
    burnPercent: number;
    launchMigratePool: boolean;
  }
  
export interface TokenInfo {
    chainId: number;
    address: string;
    programId: string;
    logoURI: string;
    symbol: string;
    name: string;
    decimals: number;
    tags: Array<string>;
    extensions: Record<string, string>;
  }
  
export interface RewardInfo {
    mint: TokenInfo;
    perSecond: string;
    startTime: string;
    endTime: string;
  }
  
export interface PeriodStats {
    volume: number;
    volumeQuote: number;
    volumeFee: number;
    apr: number;
    feeApr: number;
    priceMin: number;
    priceMax: number;
    rewardApr: Array<number>;
  }
  
export interface PoolConfig {
    id: string;
    index: number;
    protocolFeeRate: number;
    tradeFeeRate: number;
    tickSpacing: number;
    fundFeeRate: number;
    defaultRange: number;
    defaultRangePoint: Array<number>;
  }