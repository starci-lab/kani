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
    createCacheKey,
    InjectRedisCache,
    PoolAnalyticsCacheResult,
} from "@modules/cache"
import {
    Cache 
} from "cache-manager"
import {
    Interval 
} from "@nestjs/schedule"
import {
    AsyncService, InjectSuperJson 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"
import {
    ApolloClientService 
} from "@modules/apollo-client"
import {
    ApolloClient, gql 
} from "@apollo/client"
import {
    createObjectId 
} from "@utils"
import SuperJSON from "superjson"
import {
    GraphQLDataNotFoundException 
} from "@exceptions"
// Implement analytics for FlowX DEX
// We use the API provided by FlowX to get the analytics data
@Injectable()
export class FlowXAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private readonly graphqlUrl = "https://api.flowx.finance/flowx-be/graphql"
    private apolloClient: ApolloClient
    private liquidityPools: Array<LiquidityPoolSchema> = []
    constructor(
    private readonly apolloClientService: ApolloClientService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    @InjectRedisCache()
    private readonly cacheManager: Cache,
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
    private readonly asyncService: AsyncService,
    ) {}

    onApplicationBootstrap() {
        this.handleAnalyticsUpdateInterval()
    }

    async onModuleInit() {
        const key = "flowx-analytics"
        this.apolloClient = this.apolloClientService.createNoCacheClient({
            key,
            url: this.graphqlUrl,
        })
        this.liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection.find(
            {
                dex: createObjectId(DexId.FlowX),
            }
        )
    }

    private async setBatchPoolAnalytics(
        liquidityPools: Array<LiquidityPoolSchema>,
    ) {
        const rawQuery = `
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
}` 
        const query = gql(rawQuery)
        const variables = {
            poolIds: liquidityPools.map((liquidityPool) => liquidityPool.poolAddress).join(","),
        }
        const { data } =
      await this.apolloClient.query<GetClmmPoolDetailRootResult>({
          query,
          variables,
      })
        if (!data) {
            throw new GraphQLDataNotFoundException(
                {
                    query: rawQuery,
                    variables,
                    url: this.graphqlUrl,
                }
            )
        }
        const {
            getClmmPoolsDetail: { items },
        } = data
        const promises: Array<Promise<void>> = []
        for (const item of items) {
            promises.push(
                (async () => {
                    const liquidityPool = liquidityPools.find(
                        (liquidityPool) => liquidityPool.poolAddress === item.id,
                    )
                    if (!liquidityPool || !liquidityPool.displayId) {
                        return
                    }
                    const poolAnalyticsCacheKey = createCacheKey(
                        CacheKey.PoolAnalytics,
                        liquidityPool.displayId
                    )
                    const poolAnalyticsCacheResult: PoolAnalyticsCacheResult = {
                        fee24H: new Decimal(item.stats.fee24H).toString(),
                        volume24H: new Decimal(item.stats.volume24H).toString(),
                        tvl: item.stats.totalLiquidityInUSD,
                        apr24H: new Decimal(item.stats.apr).div(365).div(100).toString(),
                    }
                    await this.cacheManager.set(poolAnalyticsCacheKey,
                        this.superjson.stringify(poolAnalyticsCacheResult),
                        envConfig().cache.ttl.poolAnalytics)
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    @Interval(envConfig().timeConfig.interval.analytics)
    async handleAnalyticsUpdateInterval() {
        // split into chunks of 10
        const chunks = this.liquidityPools.reduce(
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

export interface GetClmmPoolDetailRootResult {
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
