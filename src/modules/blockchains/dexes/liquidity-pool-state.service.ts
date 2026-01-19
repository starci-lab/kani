import { LiquidityPoolId, PrimaryMemoryStorageService } from "@modules/databases"
import { CacheKey, createCacheKey, DynamicDlmmLiquidityPoolInfoCacheResult, DynamicClmmLiquidityPoolInfoCacheResult, InjectRedisCache } from "@modules/cache"
import { Injectable } from "@nestjs/common"
import { Cache } from "cache-manager"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"
import { 
    DynamicDlmmLiquidityPoolInfoNotFoundException, 
    DynamicClmmLiquidityPoolInfoNotFoundException, 
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"
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
        if (!staticLiquidityPool) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
        const dynamicLiquidityPoolInfoCacheResult = await this.cacheManager.get<string>(
            createCacheKey(
                CacheKey.DynamicClmmLiquidityPoolInfo, 
                liquidityPoolId 
            ))
        const dynamicLiquidityPoolInfo = this.superjson
            .parse<DynamicClmmLiquidityPoolInfoCacheResult>(dynamicLiquidityPoolInfoCacheResult as string)
        if (!dynamicLiquidityPoolInfo) throw new DynamicClmmLiquidityPoolInfoNotFoundException(liquidityPoolId)
        return {
            static: staticLiquidityPool,
            dynamic: dynamicLiquidityPoolInfo,
        }
    }

    async getDlmmState(
        liquidityPoolId: LiquidityPoolId,
    ): Promise<DlmmLiquidityPoolState> {
        const staticLiquidityPool = this.memoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!staticLiquidityPool) throw new LiquidityPoolNotFoundException(`Liquidity pool ${liquidityPoolId} not found`)
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