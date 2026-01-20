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
    CacheKey,
    CacheService,
    PoolAnalyticsCacheResult,
} from "@modules/cache"
import {
    Interval 
} from "@nestjs/schedule"
import {
    AsyncService, DayjsService, LokiJSService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"
import {
    AxiosService 
} from "@modules/axios"
import {
    AxiosInstance 
} from "axios"
import {
    createObjectId 
} from "@modules/utils"
import {
    Collection 
} from "lokijs"

// Implement analytics for Momentum DEX
// We use the API provided by Momentum to get the analytics data
@Injectable()
export class MomentumAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private readonly url = "https://api.mmt.finance/pools/v3"
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
        const key = "momentum-analytics"
        this.axios = this.axiosService.create(key)
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection.find(
            {
                dex: {
                    $eq: createObjectId(DexId.Momentum).toString(),
                },
            }
        )
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "momentum-analytics-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            })
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    private async setAllPoolAnalytics() {
        const { data } = await this.axios.get<LiquidityPoolsApiResult>(
            this.url,
        )
        const snapshotAt = this.dayjsService.now()
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.liquidityPoolCollection.chain().data()) {
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
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: new Decimal(fees24h).toString(),
                        volume24H: new Decimal(volume24h).toString(),
                        tvl: new Decimal(tvl).toString(),
                        apr24H: new Decimal(total).div(365).div(100).toString(),
                        snapshotAt,
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

  @Interval(envConfig().dexes.momentum.interval.analytics)
    async handleAnalyticsUpdateInterval() {
        const promises: Array<Promise<void>> = []
        promises.push(this.setAllPoolAnalytics())
        await this.asyncService.allIgnoreError(promises)
    }
}

export interface LiquidityPoolsApiResult {
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
