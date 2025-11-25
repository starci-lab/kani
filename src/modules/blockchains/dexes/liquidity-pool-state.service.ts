import { LiquidityPoolId, PrimaryMemoryStorageService } from "@modules/databases"
import { CacheKey, createCacheKey, DynamicDlmmLiquidityPoolInfoCacheResult, DynamicLiquidityPoolInfoCacheResult, InjectRedisCache } from "@modules/cache"
import { Injectable } from "@nestjs/common"
import { Cache } from "cache-manager"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"
import { 
    DynamicDlmmLiquidityPoolInfoNotFoundException, 
    DynamicLiquidityPoolInfoNotFoundException, 
    LiquidityPoolNotFoundException 
} from "@exceptions"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"

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
                liquidity: dynamicLiquidityPoolInfo.liquidity,
                sqrtPriceX64: dynamicLiquidityPoolInfo.sqrtPriceX64,
                rewards: dynamicLiquidityPoolInfo.rewards,
            },
        }
    }

    async getDlmmState(
        liquidityPoolId: LiquidityPoolId,
    ): Promise<DlmmLiquidityPoolState> {
        const staticLiquidityPool = this.memoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!staticLiquidityPool) throw new LiquidityPoolNotFoundException(liquidityPoolId)
        const dynamicLiquidityPoolInfoCacheResult = await this.cacheManager.get<string>(
            createCacheKey(
                CacheKey.DynamicDlmmLiquidityPoolInfo,
                liquidityPoolId
            ))
        const dynamicLiquidityPoolInfo = this.superjson
            .parse<DynamicDlmmLiquidityPoolInfoCacheResult>(dynamicLiquidityPoolInfoCacheResult as string)
        if (!dynamicLiquidityPoolInfo) throw new DynamicDlmmLiquidityPoolInfoNotFoundException(liquidityPoolId)
        return {
            static: staticLiquidityPool,
            dynamic: dynamicLiquidityPoolInfo,
        }
    }   
}