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
    CacheKey, 
    CacheService
} from "@modules/cache"
import {
    Interval 
} from "@nestjs/schedule"
import {
    createObjectId 
} from "@modules/utils"
import {
    AsyncService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"
import {
    DayjsService, 
    LokiJSService
} from "@modules/mixin"
import {
    Collection 
} from "lokijs"

// Implement analytics for Meteora DEX
// We use the API provided by Meteora to get the analytics data
@Injectable()
export class MeteoraAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private readonly url = "https://dlmm-api.meteora.ag/pair/all_by_groups"
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
    private axios: AxiosInstance
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
        const key = "meteora-analytics"
        this.axios = this.axiosService.create(key)
        const liquidityPools = this.primaryMemoryStorageService.liquidityPoolCollection.find(
            {
                dex: {
                    $eq: createObjectId(DexId.Meteora).toString(),
                },
            }
        )
        this.liquidityPoolCollection = await this.lokiJSService.createCollection<LiquidityPoolSchema>(
            "meteora-analytics-liquidity-pools", 
            {
                indices: ["poolAddress",
                    "displayId",
                    "dex"],
            }
        )
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    private async setBatchPoolAnalytics(liquidityPools: Array<LiquidityPoolSchema>) {
        // Get the liquidity pool
        const baseURL = new URL(this.url)
        for (const liquidityPool of liquidityPools) {
            baseURL.searchParams.append("include_pool_token_pairs",
                liquidityPool.displayId)
        }
        const { data } = await this.axios.get<PoolAnalyticsResult>(baseURL.toString())
        const promises: Array<Promise<void>> = []
        const snapshotAt = this.dayjsService.now()
        for (const group of data.groups) {
            for (const pair of group.pairs) {
                promises.push(
                    (async () => {
                        const liquidityPool = liquidityPools.find(
                            (liquidityPool) => liquidityPool.poolAddress === pair.address,
                        )
                        if (!liquidityPool || !liquidityPool.displayId) {
                            return
                        }
                        await this.cacheService.set(
                            {
                                key: CacheKey.PoolAnalytics,
                                args: [liquidityPool.id],
                                cacheResult: {
                                    fee24H: new Decimal(pair.fees_24h).toString(),
                                    volume24H: new Decimal(pair.trade_volume_24h).toString(),
                                    tvl: pair.liquidity,
                                    apr24H: new Decimal(pair.apr).div(100).toString(),
                                    snapshotAt,
                                },
                            }
                        )
                    })(),
                )
            }
        }  
        await this.asyncService.allIgnoreError(promises)
    }
    
    @Interval(envConfig().dexes.meteora.interval.analytics)
    async handleAnalyticsUpdateInterval() {
        // split into chunks of 10
        const chunks = this.liquidityPoolCollection.chain().data().reduce(
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

export interface PoolAnalyticsResult   {
    groups: Array<Group>
    total: number
  }
  
export interface Group {
    name: string
    pairs: Array<Pair>
  }
  
export interface Pair {
    address: string
    name: string
    mint_x: string
    mint_y: string
    reserve_x: string
    reserve_y: string
    reserve_x_amount: number
    reserve_y_amount: number
    bin_step: number
    base_fee_percentage: string
    max_fee_percentage: string
    protocol_fee_percentage: string
    liquidity: string
    reward_mint_x: string
    reward_mint_y: string
    fees_24h: number
    today_fees: number
    trade_volume_24h: number
    cumulative_trade_volume: string
    cumulative_fee_volume: string
    current_price: number
    apr: number
    apy: number
    farm_apr: number
    farm_apy: number
    hide: boolean
    is_blacklisted: boolean
    fees: Fees
    fee_tvl_ratio: FeeTvlRatio
    volume: Volume
    is_verified: boolean
  }
  
export interface Fees {
    min_30: number
    hour_1: number
    hour_2: number
    hour_4: number
    hour_12: number
    hour_24: number
  }
  
export interface FeeTvlRatio {
    min_30: number
    hour_1: number
    hour_2: number
    hour_4: number
    hour_12: number
    hour_24: number
  }
  
export interface Volume {
    min_30: number
    hour_1: number
    hour_2: number
    hour_4: number
    hour_12: number
    hour_24: number
  }
  