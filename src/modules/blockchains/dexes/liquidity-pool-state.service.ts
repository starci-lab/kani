import {
    LiquidityPoolSchema, LiquidityPoolType 
} from "@modules/databases"
import {
    CacheService, 
    CacheKey,
    DynamicClmmLiquidityPoolInfoCacheResult,
    DynamicDlmmLiquidityPoolInfoCacheResult,
    DynamicLiquidityPoolInfoCacheResult
} from "@modules/cache"
import {
    Injectable 
} from "@nestjs/common"
import { 
    CacheNotFoundException,
} from "@modules/exceptions"

@Injectable()
export class LiquidityPoolStateService {
    constructor(
        private readonly cacheService: CacheService,
    ) {}

    /**
     * Stage: on-chain/data fetch (via cache)
     *
     * Fetches the dynamic CLMM pool info from cache and combines it with the static pool record.
     *
     * Throws:
     * - CacheNotFoundException: when the required dynamic cache entry is missing
     */
    private async getDynamicClmmLiquidityPoolInfo(
        liquidityPool: LiquidityPoolSchema,
    ): Promise<DynamicClmmLiquidityPoolInfoCacheResult> {
        const dynamicLiquidityPoolInfoCacheResult = await this.cacheService.get(
            {
                key: CacheKey.DynamicClmmLiquidityPoolInfo,
                args: [liquidityPool.id.toString()],
            }
        )
        if (!dynamicLiquidityPoolInfoCacheResult) {
            throw new CacheNotFoundException({
                key: CacheKey.DynamicClmmLiquidityPoolInfo,
                args: [liquidityPool.id.toString()],
            })
        }
        return dynamicLiquidityPoolInfoCacheResult
    }

    /**
     * Stage: on-chain/data fetch (via cache)
     *
     * Fetches the dynamic DLMM pool info from cache and combines it with the static pool record.
     *
     * Throws:
     * - CacheNotFoundException: when the required dynamic cache entry is missing
     */
    private async getDynamicDlmmLiquidityPoolInfo(
        liquidityPool: LiquidityPoolSchema,
    ): Promise<DynamicDlmmLiquidityPoolInfoCacheResult> {
        const dynamicLiquidityPoolInfoCacheResult = await this.cacheService.get(
            {
                key: CacheKey.DynamicDlmmLiquidityPoolInfo,
                args: [liquidityPool.id],
            }
        )
        if (!dynamicLiquidityPoolInfoCacheResult) {
            throw new CacheNotFoundException({
                key: CacheKey.DynamicDlmmLiquidityPoolInfo,
                args: [liquidityPool.id.toString()],
            })
        }
        return dynamicLiquidityPoolInfoCacheResult
    }   

    /**
     * Stage: on-chain/data fetch (via cache)
     *
     * Returns the typed liquidity pool state depending on pool type.
     *
     * Throws:
     * - CacheNotFoundException: when required dynamic cache entry is missing (from helpers)
     */
    async getDynamicLiquidityPoolInfo(
        liquidityPool: LiquidityPoolSchema,
    ): Promise<
    DynamicLiquidityPoolInfoCacheResult
    > {
        switch (liquidityPool.type) {
        case LiquidityPoolType.Clmm:
            return await this.getDynamicClmmLiquidityPoolInfo(liquidityPool)
        case LiquidityPoolType.Dlmm:
            return await this.getDynamicDlmmLiquidityPoolInfo(liquidityPool)
        }
    }
}