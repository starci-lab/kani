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
import {
    CacheKey,
    createCacheKey,
    InjectRedisCache,
    PoolAnalyticsCacheResult,
} from "@modules/cache"
import { Cache } from "cache-manager"
import { Interval } from "@nestjs/schedule"
import { createObjectId } from "@utils"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"
import SuperJSON from "superjson"

// Implement analytics for Raydium DEX
// We use the API provided by Raydium to get the analytics data
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
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
    ) {}

    async onApplicationBootstrap() {
        await this.handleAnalyticsUpdateInterval()
    }

    async onModuleInit() {
        const key = "raydium-analytics"
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
        const poolAddresses = liquidityPools
            .map((pool) => pool.poolAddress)
            .join(",")
        const { data } = await this.axios.get<PoolResponse>(
            `https://api-v3.raydium.io/pools/info/ids?ids=${poolAddresses}`,
        )
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
                    const poolAnalyticsCacheKey = createCacheKey(
                        CacheKey.PoolAnalytics,
                        liquidityPool.displayId,
                    )
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: new Decimal(day.volume).toString(),
                        volume24H: new Decimal(day.volumeQuote).toString(),
                        tvl: new Decimal(tvl).toString(),
                        apr24H: new Decimal(day.apr).div(365).div(100).toString(),
                    }
                    await this.cacheManager.set(
                        poolAnalyticsCacheKey,
                        this.superjson.stringify(poolAnalyticsCacheResult),
                        envConfig().cache.ttl.poolAnalytics,
                    )
                })(),
            )
            await this.asyncService.allIgnoreError(promises)
        }
    }
  @Interval(envConfig().interval.analytics)
    async handleAnalyticsUpdateInterval() {
        const liquidityPools =
      this.primaryMemoryStorageService.liquidityPools.filter(
          (liquidityPool) =>
              liquidityPool.dex.toString() ===
          createObjectId(DexId.Raydium).toString(),
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
