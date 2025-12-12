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

// Implement analytics for Cetus DEX
// We use the API provided by Cetus to get the analytics data
@Injectable()
export class CetusAnalyticsService
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
        const key = "cetus-analytics"
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
        const { data: { data: { list } } } = await this.axios.post<CetusPoolListResponse>(
            "https://api-sui.cetus.zone/v3/sui/clmm/stats_pools",
            {
                filter: "all",
                sortBy: "vol",
                sortOrder: "asc",
                limit: 100,
                offset: 0,
                coinTypes: [],
                pools: liquidityPools.map((liquidityPool) => liquidityPool.poolAddress),
            },
        )
        const promises: Array<Promise<void>> = []
        for (const item of list) {
            promises.push(
                (async () => {
                    const liquidityPool = liquidityPools.find(
                        (liquidityPool) => liquidityPool.poolAddress === item.pool,
                    )
                    if (!liquidityPool || !liquidityPool.displayId) {
                        return
                    }
                    const tvl = item.tvl
                    const apr = item.totalApr
                    const { fee, vol } = item.stats[0]
                    const poolAnalyticsCacheKey = createCacheKey(
                        CacheKey.PoolAnalytics,
                        liquidityPool.displayId
                    )
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: fee,
                        volume24H: vol,
                        tvl,
                        apr24H: new Decimal(apr).div(365).toString(),
                    }
                    await this.cacheManager.set(poolAnalyticsCacheKey, this.superjson.stringify(poolAnalyticsCacheResult), envConfig().cache.ttl.poolAnalytics)
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
          createObjectId(DexId.Cetus).toString(),
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

export interface CetusPoolListResponse {
  code: number;
  msg: string;
  data: CetusPoolListData;
}

export interface CetusPoolListData {
  total: number;
  list: Array<CetusPoolInfo>;
}

export interface CetusPoolInfo {
  pool: string;
  feeRate: number;
  showReverse: boolean;
  coinA: CetusCoinInfo;
  coinB: CetusCoinInfo;
  tvl: string;
  totalApr: string;
  stats: Array<CetusPoolStat>;
  miningRewarders: Array<CetusMiningRewarder>;
  extensions: CetusPoolExtensions;
}

export interface CetusCoinInfo {
  coinType: string;
  symbol: string;
  decimals: number;
  isVerified: boolean;
  logoURL: string;
}

export interface CetusPoolStat {
  dateType: "24H" | "7D" | "30D";
  vol: string;
  fee: string;
  apr: string;
}

export interface CetusMiningRewarder {
  coinType: string;
  symbol: string;
  decimals: number;
  logoURL: string;
  display: boolean;
  apr: string;
  emissionsPerSecond: string;
}

export interface CetusPoolExtensions {
  frozen: string;
  pool_tag: string;
}
