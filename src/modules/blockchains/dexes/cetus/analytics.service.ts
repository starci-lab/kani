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
    PoolAnalyticsCacheResult,
    CacheService,
    CacheKey,
} from "@modules/cache"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/utils"
import {
    AsyncService,
    DayjsService,
    LokiJSService
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"
import {
    Collection 
} from "lokijs"
// Implement analytics for Cetus DEX
// We use the API provided by Cetus to get the analytics data
@Injectable()
export class CetusAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private readonly uri = "https://api-sui.cetus.zone/v3/sui/clmm/stats_pools"
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
        const key = "cetus-analytics"
        this.axios = this.axiosService.create(key)
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.Cetus).toString(),
                },
            })
            .data({
                removeMeta: true 
            })
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "cetus-analytics-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "id"],
            })
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    private async setBatchPoolAnalytics(
        liquidityPools: Array<LiquidityPoolSchema>,
    ) {
        // Get the liquidity pool
        if (!liquidityPools.length) {
            return
        }
        const { data: { data: { list } } } = await this.axios.post<CetusPoolListResult>(
            this.uri,
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
        const snapshotAt = this.dayjsService.now()
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
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: fee,
                        volume24H: vol,
                        tvl,
                        apr24H: apr,
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

  @Interval(envConfig().dexes.cetus.interval.analytics)
    async handleAnalyticsUpdateInterval() {
        // split into chunks of 10
        const chunks = this.liquidityPoolCollection.find().reduce(
            (acc: Array<Array<LiquidityPoolSchema>>, liquidityPool, index) => {
                const chunkIndex = new Decimal(index).div(10).floor().toNumber()
                acc[chunkIndex] = [...(acc[chunkIndex] || []),
                    liquidityPool]
                return acc
            }, 
            [],
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

export interface CetusPoolListResult {
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
