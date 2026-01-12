import { InvalidPoolTokensException } from "@exceptions"
import { CacheKey, createCacheKey, DynamicLiquidityPoolInfoCacheResult, DynamicDlmmLiquidityPoolInfoCacheResult, PoolAnalyticsCacheResult } from "@modules/cache"
import { PrimaryMemoryStorageService, LiquidityPoolSchema, GraphQLDynamicLiquidityPoolInfo } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import Decimal from "decimal.js"
import { SuperJSON } from "superjson"
import { ClmmTickFormulaService } from "@modules/blockchains"
import { InjectRedisCache } from "@modules/cache"
import { InjectSuperJson } from "@modules/mixin"
import { Cache } from "cache-manager"

@Injectable()
export class AttachDynamicInfoService {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly clmmTickFormulaService: ClmmTickFormulaService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async attachDynamicInfo(
        liquidityPool: LiquidityPoolSchema
    ): Promise<void> {
        const tokens = this.primaryMemoryStorageService.tokens

        const tokenA = tokens.find(token => token.id.toString() === liquidityPool.tokenA.toString())
        const tokenB = tokens.find(token => token.id.toString() === liquidityPool.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Invalid pool tokens")
        }
        const keys = [
            createCacheKey(CacheKey.DynamicLiquidityPoolInfo, liquidityPool.displayId),
            createCacheKey(CacheKey.DynamicDlmmLiquidityPoolInfo, liquidityPool.displayId),
            createCacheKey(CacheKey.PoolAnalytics, liquidityPool.displayId),
        ]
        const [
            serializedDynamic,
            serializedDlmm,
            serializedAnalytics
        ] = await this.cacheManager.mget<string>(keys)
        const dynamicInfo: GraphQLDynamicLiquidityPoolInfo = {}
        if (serializedDynamic) {
            const dynamicClmmInfo = this.superjson.parse<DynamicLiquidityPoolInfoCacheResult>(serializedDynamic)
            dynamicInfo.tickCurrent = dynamicClmmInfo.tickCurrent
            dynamicInfo.liquidity = dynamicClmmInfo.liquidity.toString()
            dynamicInfo.price = this.clmmTickFormulaService
                .sqrtPriceX64ToPrice({
                    sqrtPriceX64: dynamicClmmInfo.sqrtPriceX64,
                    decimalsA: tokenA.decimals,
                    decimalsB: tokenB.decimals,
                })
                .toNumber()
        }
        if (serializedDlmm) {
            const dynamicDlmmInfo = this.superjson.parse<DynamicDlmmLiquidityPoolInfoCacheResult>(serializedDlmm)
            dynamicInfo.activeId = dynamicDlmmInfo.activeId
        }
        if (serializedAnalytics) {
            const analyticsInfo = this.superjson.parse<PoolAnalyticsCacheResult>(serializedAnalytics)
            dynamicInfo.fees24H = new Decimal(analyticsInfo.fee24H).toNumber()
            dynamicInfo.volume24H = new Decimal(analyticsInfo.volume24H).toNumber()
            dynamicInfo.apr24H = new Decimal(analyticsInfo.apr24H).toNumber()
            dynamicInfo.tvl = analyticsInfo.tvl
        }
        liquidityPool.dynamicInfo = dynamicInfo
    }
}   