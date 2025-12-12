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
import { FlowXPoolBatchInfoNotFoundException } from "@exceptions"
import {
    CacheEntry,
    CacheKey,
    createCacheKey,
    InjectRedisCache,
    PoolAnalyticsCacheResult,
} from "@modules/cache"
import { Cache } from "cache-manager"
import { Interval } from "@nestjs/schedule"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"
import { ApolloClientService } from "@modules/apollo-client"
import { ApolloClient, gql } from "@apollo/client"
import { createObjectId } from "@utils"
import SuperJSON from "superjson"
// Implement analytics for FlowX DEX
// We use the API provided by FlowX to get the analytics data
@Injectable()
export class FlowXAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private apolloClient: ApolloClient
    constructor(
    private readonly apolloClientService: ApolloClientService,
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
        const key = "flowx-analytics"
        this.apolloClient = this.apolloClientService.createNoCacheClient({
            key,
            url: "https://api.flowx.finance/flowx-be/graphql",
        })
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
        const { data } =
      await this.apolloClient.query<GetClmmPoolDetailRootResponse>({
          query: gql`
          query GetClmmPoolsDetail($poolIds: String!) {
  getClmmPoolsDetail(poolIds: $poolIds) {
    items {
      id
      feeRate
      coinYType
      coinXType
      lpObjectId
      reserveX
      reserveY
      stats {
        volume24H
        volume7D
        fee24H
        fee7D
        apr
        totalLiquidityInUSD
        liquidityUSDX
        liquidityUSDY
        averageLiquidity
      }
      coinXInfo {
        name
        symbol
        type
        decimals
        iconUrl
        derivedPriceInUSD
      }
      coinYInfo {
        name
        symbol
        type
        decimals
        iconUrl
        derivedPriceInUSD
      }
    }
    total
  }
}
        `,
          variables: {
              poolIds: liquidityPools
                  .map((liquidityPool) => liquidityPool.poolAddress)
                  .join(","),
          },
      })
        if (!data) {
            throw new FlowXPoolBatchInfoNotFoundException(liquidityPoolIds, "Pool batch info not found")
        }
        const {
            getClmmPoolsDetail: { items },
        } = data
        const cacheEntries: Array<CacheEntry> = []
        for (const item of items) {
            const liquidityPool = liquidityPools.find(
                (liquidityPool) => liquidityPool.poolAddress === item.id,
            )
            if (!liquidityPool) {
                continue
            }
            const poolAnalyticsCacheKey = createCacheKey(
                CacheKey.PoolAnalytics,
                liquidityPool.displayId)
            const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                fee24H: new Decimal(item.stats.fee24H).toString(),
                volume24H: new Decimal(item.stats.volume24H).toString(),
                tvl: item.stats.totalLiquidityInUSD,
                apr24H: new Decimal(item.stats.apr).div(365).div(100).toString(),
            }
            cacheEntries.push({
                key: poolAnalyticsCacheKey,
                value: this.superjson.stringify(poolAnalyticsCacheResult),
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
          createObjectId(DexId.FlowX).toString(),
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

export interface GetClmmPoolDetailRootResponse {
  getClmmPoolsDetail: {
    items: Array<ClmmPoolDetail>;
  };
}

export interface ClmmPoolDetail {
  id: string;
  feeRate: number;
  coinYType: string;
  coinXType: string;
  lpObjectId: string;
  reserveX: string;
  reserveY: string;
  stats: ClmmPoolStats;
  coinXInfo: ClmmCoinInfo;
  coinYInfo: ClmmCoinInfo;
  __typename: string;
}

export interface ClmmPoolStats {
  volume24H: string;
  volume7D: string;
  fee24H: string;
  fee7D: string;
  apr: string;
  totalLiquidityInUSD: string;
  liquidityUSDX: string;
  liquidityUSDY: string;
  averageLiquidity: string;
  __typename: string;
}

export interface ClmmCoinInfo {
  name: string;
  symbol: string;
  type: string;
  decimals: number;
  iconUrl: string;
  derivedPriceInUSD: string;
  __typename: string;
}
