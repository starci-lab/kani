import { LiquidityPoolId, PrimaryMemoryStorageService } from "@modules/databases"
import { CacheKey, createCacheKey, DynamicLiquidityPoolInfoCacheResult, InjectRedisCache } from "@modules/cache"
import { Injectable } from "@nestjs/common"
import { Cache } from "cache-manager"
import { LiquidityPoolState } from "../interfaces"
import { DynamicLiquidityPoolInfoNotFoundException, LiquidityPoolNotFoundException } from "@exceptions"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import BN from "bn.js"

@Injectable()
export class LiquidityPoolStateService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
    ) {}

    async getState(
        liquidityPoolId: LiquidityPoolId,
    ): Promise<LiquidityPoolState> {
        const staticLiquidityPool = this.memoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!staticLiquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)
        const dynamicLiquidityPoolInfoCacheResult = await this.cacheManager.get<string>(
            createCacheKey(
                CacheKey.DynamicLiquidityPoolInfo, 
                liquidityPoolId
            ))
        const dynamicLiquidityPoolInfo = this.superjson
            .parse<DynamicLiquidityPoolInfoCacheResult>(dynamicLiquidityPoolInfoCacheResult as string)
        if (!dynamicLiquidityPoolInfo) throw new DynamicLiquidityPoolInfoNotFoundException(liquidityPoolId)
        return {
            static: staticLiquidityPool,
            dynamic: {
                tickCurrent: dynamicLiquidityPoolInfo.tickCurrent,
                liquidity: new BN(dynamicLiquidityPoolInfo.liquidity),
                sqrtPriceX64: new BN(dynamicLiquidityPoolInfo.sqrtPriceX64),
            },
        }
    }
}