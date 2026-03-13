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
    createObjectId,
    sleep
} from "@modules/common"
import {
    AsyncService,
    DayjsService,
    JitterService,
    ReadinessWatcherFactoryService
} from "@modules/mixin"
import {
    envConfig
} from "@modules/env"
import {
    ApolloClientService
} from "@modules/api"
import {
    ApolloClient, gql
} from "@apollo/client"
import {
    GraphQLDataNotFoundException
} from "@modules/exceptions"
import {
    GetClmmPoolDetailRootResult
} from "./types"
import {
    Decimal 
} from "decimal.js"

/**
 * Fetches and caches FlowX pool analytics (fees, volume, TVL, APR) from FlowX GraphQL API.
 *
 * @example
 * await flowxAnalyticsService.onModuleInit()
 * // then handleAnalyticsUpdateInterval runs on schedule
 */
@Injectable()
export class FlowXAnalyticsService implements OnModuleInit, OnApplicationBootstrap {
    private readonly uri = "https://api.flowx.finance/flowx-be/graphql"
    private apolloClient: ApolloClient
    private liquidityPoolMap: Map<string, LiquidityPoolSchema> = new Map()

    constructor(
        private readonly apolloClientService: ApolloClientService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly jitterService: JitterService,
    ) { }

    onApplicationBootstrap() {
        this.handleAnalyticsUpdateInterval()
    }

    async onModuleInit() {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        const key = "flowx-analytics"
        this.apolloClient = this.apolloClientService.createClient({
            key,
            uri: this.uri,
        })
        const liquidityPools = Array.from(this.primaryMemoryStorageService.liquidityPoolMap.values())
            .filter(
                (liquidityPool) => liquidityPool.dex.toString() === createObjectId(DexId.FlowX).toString(),
            )
        this.liquidityPoolMap = new Map(
            liquidityPools.map((liquidityPool) => [liquidityPool.id,
                liquidityPool
            ]
            )
        )
    }

    /**
     * Fetches analytics for a batch of pools from FlowX GraphQL and writes to cache.
     *
     * @param liquidityPools - Pools to fetch analytics for
     */
    private async setBatchPoolAnalytics(
        liquidityPools: Array<LiquidityPoolSchema>,
    ): Promise<void> {
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
                                fee24H: item.stats.fee24H.toString(),
                                volume24H: item.stats.volume24H.toString(),
                                tvl: item.stats.totalLiquidityInUSD.toString(),
                                apr24H: new Decimal(item.stats.apr).div(365).div(100).toString(),
                                snapshotAt,
                                liquidity: item.stats.totalLiquidityInUSD.toString(),
                            },
                        }
                    )
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Runs on interval: chunks pools by 10, fetches and caches analytics per chunk.
     */
    @Interval(envConfig().dexes.flowx.interval.analytics)
    async handleAnalyticsUpdateInterval(): Promise<void> {
        await this.jitterService.delayWithJitter(
            envConfig().dexes.flowx.interval.analytics
        )
        const chunks = Array.from(this.liquidityPoolMap.values()).reduce(
            (acc: Array<Array<LiquidityPoolSchema>>, liquidityPool, index) => {
                const chunkIndex = Math.floor(index / 10)
                acc[chunkIndex] = [...(acc[chunkIndex] || []),
                    liquidityPool]
                return acc
            },
            [],
        )
        for (const chunk of chunks) {
            await this.asyncService.safeRun(
                async () => {
                    await this.setBatchPoolAnalytics(chunk)
                }
            )
            await sleep(envConfig().dexes.flowx.interval.analyticsRequestDelayMs)
        }
    }
}

