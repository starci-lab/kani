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
import { AxiosService } from "@modules/axios"
import { AxiosInstance } from "axios"
import SuperJSON from "superjson"
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
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
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
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of liquidityPools) {
            promises.push(
                (async () => {
                    const pool = data.data.find(
                        (pool) => pool.poolId === liquidityPool.poolAddress,
                    )
                    if (!pool) {
                        return
                    }
                    const {
                        fees24h,
                        aprBreakdown: { total },
                        volume24h,
                        tvl,
                    } = pool
                    const poolAnalyticsCacheKey = createCacheKey(
                        CacheKey.PoolAnalytics,
                        liquidityPool.displayId
                    )
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: new Decimal(fees24h).toString(),
                        volume24H: new Decimal(volume24h).toString(),
                        tvl: new Decimal(tvl).toString(),
                        apr24H: new Decimal(total).div(365).div(100).toString(),
                    }
                    await this.cacheManager.set(poolAnalyticsCacheKey, this.superjson.stringify(poolAnalyticsCacheResult), envConfig().cache.ttl.poolAnalytics)
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
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
