import {
    DexId,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import {
    CacheEntry,
    CacheKey,
    createCacheKey,
    InjectRedisCache,
} from "@modules/cache"
import { Cache } from "cache-manager"
import { Interval } from "@nestjs/schedule"
import { createObjectId } from "@utils"
import { AsyncService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"
import { AxiosService } from "@modules/axios"
import { AxiosInstance } from "axios"
// Implement analytics for Momentum DEX
// We use the API provided by Momentum to get the analytics data
@Injectable()
export class MomentumAnalyticsService
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
        const key = "momentum-analytics"
        this.axios = this.axiosService.create(key)
        this.axiosService.addRetry({ key })
    }

    private async setAllPoolAnalytics() {
        const liquidityPools =
      this.primaryMemoryStorageService.liquidityPools.filter(
          (liquidityPool) =>
              liquidityPool.dex.toString() ===
          createObjectId(DexId.Momentum).toString(),
      )
        if (!liquidityPools.length) {
            return
        }
        const { data } = await this.axios.get<LiquidityPoolsApiResponse>(
            "https://api.mmt.finance/pools/v3",
        )
        const cacheEntries: Array<CacheEntry> = []
        for (const liquidityPool of liquidityPools) {
            const pool = data.data.find(
                (pool) => pool.poolId === liquidityPool.poolAddress,
            )
            if (!pool) {
                continue
            }
            const {
                fees24h,
                aprBreakdown: { total },
                volume24h,
                tvl,
            } = pool
            cacheEntries.push({
                key: createCacheKey(CacheKey.Fee24H, liquidityPool.displayId),
                value: new Decimal(fees24h).toString(),
                ttl: envConfig().cache.ttl.poolAnalytics,
            })
            cacheEntries.push({
                key: createCacheKey(CacheKey.Volume24H, liquidityPool.displayId),
                value: new Decimal(volume24h).toString(),
                ttl: envConfig().cache.ttl.poolAnalytics,
            })
            cacheEntries.push({
                key: createCacheKey(CacheKey.Liquidity, liquidityPool.displayId),
                value: new Decimal(tvl).toString(),
                ttl: envConfig().cache.ttl.poolAnalytics,
            })
            cacheEntries.push({
                key: createCacheKey(CacheKey.APR24H, liquidityPool.displayId),
                value: new Decimal(total).div(365).div(100).toString(),
                ttl: envConfig().cache.ttl.poolAnalytics,
            })
        }
        await this.cacheManager.mset(cacheEntries)
    }

  @Interval(envConfig().interval.analytics)
    async handleAnalyticsUpdateInterval() {
        const promises: Array<Promise<void>> = []
        promises.push(this.setAllPoolAnalytics())
        await this.asyncService.allIgnoreError(promises)
    }
}

export interface LiquidityPoolsApiResponse {
  status: number;
  message: string;
  data: Array<LiquidityPool>;
}

export interface LiquidityPool {
  poolId: string;

  tokenXType: string;
  tokenYType: string;

  tickSpacing: number;
  lpFeesPercent: string;
  protocolFeesPercent: string;

  isStable: boolean;
  minTickRangeFactor: number;
  isDeprecated: boolean;

  currentSqrtPrice: string;
  currentTickIndex: string;

  liquidity: string;
  liquidityHM: string;

  tokenXReserve: string;
  tokenYReserve: string;

  tvl: string;
  volume24h: string;
  fees24h: string;
  apy: string;

  timestamp: string;

  rewarders: Array<Rewarder>;

  tokenX: TokenInfo;
  tokenY: TokenInfo;

  aprBreakdown: AprBreakdown;
}

export interface TokenInfo {
  coinType: string;
  name: string;
  ticker: string;
  iconUrl: string;
  decimals: number;
  description: string;
  isVerified: boolean;
  isMmtWhitelisted: boolean;
  tokenType: string;
  price: string;
}

export interface AprBreakdown {
  total: string;
  fee: string;
  rewards: Array<RewardApr>;
}

export interface RewardApr {
  rewarder: string;
  apr: string;
}

export interface Rewarder {
  rewarder: string;
  apr: string;
}
