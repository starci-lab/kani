import { Injectable } from "@nestjs/common"
import { 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { 
    DynamicLiquidityPoolInfo, 
    DynamicLiquidityPoolsInfoRequest 
} from "./dynamic.dto"
import { 
    CacheKey, 
    createCacheKey, 
    DynamicDlmmLiquidityPoolInfoCacheResult, 
    InjectRedisCache, 
    PoolAnalyticsCacheResult 
} from "@modules/cache"
import { Cache } from "cache-manager"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { DynamicLiquidityPoolInfoCacheResult } from "@modules/cache"
import { TickMathService } from "@modules/blockchains"
import { InvalidPoolTokensException, LiquidityPoolNotFoundException } from "@exceptions"
import Decimal from "decimal.js"
/**
 * Service that provides static reference data
 * such as tokens, liquidity pools, and DEX metadata
 * from the in-memory database.
 */
@Injectable()
export class DynamicService {
    constructor(
        private readonly tickMathService: TickMathService,
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
    ) {}

    async dynamicLiquidityPoolsInfo(
        request: DynamicLiquidityPoolsInfoRequest
    ): Promise<Array<DynamicLiquidityPoolInfo>> {
        const dynamicLiquidityPoolInfos: Array<DynamicLiquidityPoolInfo> = []
        for (const liquidityPoolId of request.liquidityPoolIds) {
            const liquidityPool = this.memoryStorageService.liquidityPools.find(
                pool => pool.displayId === liquidityPoolId
            )
            if (!liquidityPool) {
                // if user pass invalid liquidity pool id, throw an error
                throw new LiquidityPoolNotFoundException(liquidityPoolId, "Liquidity pool not found")
            }
            const tokenAEntity = this.memoryStorageService.tokens.find(
                token => token.id === liquidityPool.tokenA.toString()
            )
           
            const tokenBEntity = this.memoryStorageService.tokens.find(
                token => token.id === liquidityPool.tokenB.toString()
            )
            if (!tokenAEntity || !tokenBEntity) {
                throw new InvalidPoolTokensException("Invalid pool tokens")
            }
            const info: DynamicLiquidityPoolInfo = {
                id: liquidityPool.id,
            }
            const dynamicLiquidityPoolInfoCacheKey = createCacheKey(
                CacheKey.DynamicLiquidityPoolInfo,
                liquidityPoolId,
            )
            const dynamicDlmmLiquidityPoolInfoCacheKey = createCacheKey(
                CacheKey.DynamicDlmmLiquidityPoolInfo,
                liquidityPoolId,
            )
            const poolAnalyticsCacheKey = createCacheKey(
                CacheKey.PoolAnalytics,
                liquidityPoolId,
            )
            // retrieve the pool dynamic & analytics data
            const [
                serializedDynamicLiquidityPoolInfo, 
                serializedDynamicDlmmLiquidityPoolInfo, 
                serializedPoolAnalytics
            ] = await this.cacheManager.mget<string>(
                [
                    dynamicLiquidityPoolInfoCacheKey, 
                    dynamicDlmmLiquidityPoolInfoCacheKey, 
                    poolAnalyticsCacheKey
                ]
            )
            if (serializedDynamicLiquidityPoolInfo) {
                const dynamicLiquidityPoolInfoData = this.superjson.parse<DynamicLiquidityPoolInfoCacheResult>(serializedDynamicLiquidityPoolInfo)
                info.tickCurrent = dynamicLiquidityPoolInfoData.tickCurrent
                info.liquidity = dynamicLiquidityPoolInfoData.liquidity.toString()
                info.price = this.tickMathService.sqrtPriceX64ToPrice({
                    sqrtPriceX64: dynamicLiquidityPoolInfoData.sqrtPriceX64,
                    decimalsA: tokenAEntity.decimals,
                    decimalsB: tokenBEntity.decimals,
                }).price.toNumber()
            }
            if (serializedDynamicDlmmLiquidityPoolInfo) {
                const dynamicDlmmLiquidityPoolInfoData = this.superjson.parse<DynamicDlmmLiquidityPoolInfoCacheResult>(serializedDynamicDlmmLiquidityPoolInfo)
                info.activeId = dynamicDlmmLiquidityPoolInfoData.activeId
            }
            if (serializedPoolAnalytics) {
                const poolAnalyticsData = this.superjson.parse<PoolAnalyticsCacheResult>(serializedPoolAnalytics)
                info.fees24H = new Decimal(poolAnalyticsData.fee24H).toNumber()
                info.volume24H = new Decimal(poolAnalyticsData.volume24H).toNumber()
                info.apr24H = new Decimal(poolAnalyticsData.apr24H).toNumber()
                info.tvl = poolAnalyticsData.tvl
            }
            dynamicLiquidityPoolInfos.push(info)
        }
        return dynamicLiquidityPoolInfos
    }
}