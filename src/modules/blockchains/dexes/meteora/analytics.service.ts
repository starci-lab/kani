import { AxiosService } from "@modules/axios"
import {
    DexId,
    LiquidityPoolId,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import { AxiosInstance } from "axios"
import { LiquidityPoolNotFoundException } from "@exceptions"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { Interval } from "@nestjs/schedule"
import { createObjectId } from "@utils"
import { AsyncService, RandomDelayService } from "@modules/mixin"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"

// Implement analytics for Meteora DEX
// We use the API provided by Meteora to get the analytics data
@Injectable()
export class MeteoraAnalyticsService
implements OnModuleInit, OnApplicationBootstrap
{
    private axios: AxiosInstance
    constructor(
    private readonly axiosService: AxiosService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    @InjectRedisCache()
    private readonly cacheManager: Cache,
    private readonly asyncService: AsyncService,
    private readonly randomDelayService: RandomDelayService,
    ) {}

    async onApplicationBootstrap() {
        await this.handlePoolStateUpdateInterval()
    }

    async onModuleInit() {
        const key = "meteora-analytics"
        this.axios = this.axiosService.create(key)
        this.axiosService.addRetry({ key })
    }

    private async setPoolAnalytics(liquidityPoolId: LiquidityPoolId) {
        // Wait a random amount of time to avoid rate limiting
        await this.randomDelayService.waitRandom()
        // Get the liquidity pool
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            (liquidityPool) => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(
                liquidityPoolId,
                "Liquidity pool not found",
            )
        }
        const { data } = await this.axios.get<PoolAnalyticsResponse>(
            `https://dlmm-api.meteora.ag/pair/${liquidityPool.poolAddress}`,
        )
        const { fees_24h, liquidity, trade_volume_24h, apr } = data
        await this.cacheManager.mset([
            {
                key: createCacheKey(CacheKey.Fee24H, liquidityPoolId),
                value: new Decimal(fees_24h).toString(),
            },
            {
                key: createCacheKey(CacheKey.Volume24H, liquidityPoolId),
                value: new Decimal(trade_volume_24h).toString(),
            },
            {
                key: createCacheKey(CacheKey.Liquidity, liquidityPoolId),
                value: new Decimal(liquidity).toString(),
            },
            {
                key: createCacheKey(CacheKey.APR24H, liquidityPoolId),
                value: new Decimal(apr).mul(365).div(100).toString(),
            },
        ])
    }

  @Interval(envConfig().interval.analytics)
    async handlePoolStateUpdateInterval() {
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of this.primaryMemoryStorageService
            .liquidityPools) {
            if (
                liquidityPool.dex.toString() !==
        createObjectId(DexId.Meteora).toString()
            )
                continue
            promises.push(this.setPoolAnalytics(liquidityPool.displayId))
        }
        await this.asyncService.allIgnoreError(promises)
    }
}

interface PoolAnalyticsResponse {
  address: string;
  apr: number;
  apy: number;
  base_fee_percentage: string;
  bin_step: number;
  cumulative_fee_volume: string;
  cumulative_trade_volume: string;
  current_price: number;
  farm_apr: number;
  farm_apy: number;
  fee_tvl_ratio: {
    hour_1: number;
    hour_12: number;
    hour_2: number;
    hour_24: number;
    hour_4: number;
    min_30: number;
  };
  fees: {
    hour_1: number;
    hour_12: number;
    hour_2: number;
    hour_24: number;
    hour_4: number;
    min_30: number;
  };
  fees_24h: number;
  hide: boolean;
  is_blacklisted: boolean;
  is_verified: boolean;
  liquidity: string;
  max_fee_percentage: string;
  mint_x: string;
  mint_y: string;
  name: string;
  protocol_fee_percentage: string;
  reserve_x: string;
  reserve_x_amount: number;
  reserve_y: string;
  reserve_y_amount: number;
  reward_mint_x: string;
  reward_mint_y: string;
  tags: string[];
  today_fees: number;
  trade_volume_24h: number;
  volume: {
    hour_1: number;
    hour_12: number;
    hour_2: number;
    hour_24: number;
    hour_4: number;
    min_30: number;
  };
  launchpad: string;
}
