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
} from "@modules/cache"
import {
    Interval 
} from "@nestjs/schedule"
import {
    AsyncService, 
    LokiJSService,
} from "@modules/mixin"
import {
    DayjsService 
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
} from "@modules/utils"
import {
    GraphQLDataNotFoundException 
} from "@modules/exceptions"
import {
    Collection 
} from "lokijs"
// Implement analytics for FlowX DEX
// We use the API provided by FlowX to get the analytics data
@Injectable()
export class FlowXAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private readonly uri = "https://api.flowx.finance/flowx-be/graphql"
    private apolloClient: ApolloClient
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
    constructor(
    private readonly apolloClientService: ApolloClientService,
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
        const key = "flowx-analytics"
        this.apolloClient = this.apolloClientService.createClient({
            key,
            uri: this.uri,
        })
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                dex: {
                    $eq: createObjectId(DexId.FlowX).toString(),
                },
            })
            .data({
                removeMeta: true 
            })
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "flowx-analytics-liquidity-pools", 
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
                    url: this.uri,
                }
            )
        }
        const {
            getClmmPoolsDetail: { items },
        } = data
        const promises: Array<Promise<void>> = []
        const snapshotAt = this.dayjsService.now()
        for (const item of items) {
            promises.push(
                (async () => {
                    const liquidityPool = liquidityPools.find(
                        (liquidityPool) => liquidityPool.poolAddress === item.id,
                    )
                    if (!liquidityPool || !liquidityPool.displayId) {
                        return
                    }
                    await this.cacheService.set(
                        {
                            key: CacheKey.PoolAnalytics,
                            args: [liquidityPool.id],
                            cacheResult: {
                                fee24H: new Decimal(item.stats.fee24H).toString(),
                                volume24H: new Decimal(item.stats.volume24H).toString(),
                                tvl: item.stats.totalLiquidityInUSD,
                                apr24H: new Decimal(item.stats.apr).div(365).div(100).toString(),
                                snapshotAt,
                            },
                        }
                    )
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    @Interval(envConfig().dexes.flowx.interval.analytics)
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
