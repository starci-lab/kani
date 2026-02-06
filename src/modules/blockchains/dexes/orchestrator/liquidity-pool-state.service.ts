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

/**
 * Service responsible for fetching dynamic liquidity pool state information from cache.
 * Provides unified access to CLMM and DLMM pool dynamic state data.
 *
 * @example
 * const service = new LiquidityPoolStateService(...)
 * const state = await service.getDynamicLiquidityPoolInfo(liquidityPool)
 */
@Injectable()
export class LiquidityPoolStateService {
    constructor(
        private readonly cacheService: CacheService,
    ) {}

    /**
     * Fetches the dynamic CLMM pool info from cache.
     * Stage: on-chain/data fetch (via cache)
     *
     * @param liquidityPool - The liquidity pool schema
     * @returns Dynamic CLMM liquidity pool information from cache
     * @throws {CacheNotFoundException} When the required dynamic cache entry is missing
     */
    private async getDynamicClmmLiquidityPoolInfo(
        liquidityPool: LiquidityPoolSchema,
    ): Promise<DynamicClmmLiquidityPoolInfoCacheResult> {
        // Fetch dynamic CLMM pool info from cache
        const dynamicLiquidityPoolInfoCacheResult = await this.cacheService.get({
            key: CacheKey.DynamicClmmLiquidityPoolInfo,
            args: [liquidityPool.id.toString()],
        })

        // Stage: cache validation (cache entry must exist)
        if (!dynamicLiquidityPoolInfoCacheResult) {
            throw new CacheNotFoundException({
                key: CacheKey.DynamicClmmLiquidityPoolInfo,
                args: [liquidityPool.id.toString()],
            })
        }
        return dynamicLiquidityPoolInfoCacheResult
    }

    /**
     * Fetches the dynamic DLMM pool info from cache.
     * Stage: on-chain/data fetch (via cache)
     *
     * @param liquidityPool - The liquidity pool schema
     * @returns Dynamic DLMM liquidity pool information from cache
     * @throws {CacheNotFoundException} When the required dynamic cache entry is missing
     */
    private async getDynamicDlmmLiquidityPoolInfo(
        liquidityPool: LiquidityPoolSchema,
    ): Promise<DynamicDlmmLiquidityPoolInfoCacheResult> {
        // Fetch dynamic DLMM pool info from cache
        const dynamicLiquidityPoolInfoCacheResult = await this.cacheService.get({
            key: CacheKey.DynamicDlmmLiquidityPoolInfo,
            args: [liquidityPool.id],
        })

        // Stage: cache validation (cache entry must exist)
        if (!dynamicLiquidityPoolInfoCacheResult) {
            throw new CacheNotFoundException({
                key: CacheKey.DynamicDlmmLiquidityPoolInfo,
                args: [liquidityPool.id.toString()],
            })
        }
        return dynamicLiquidityPoolInfoCacheResult
    }   

    /**
     * Returns the typed liquidity pool state depending on pool type.
     * Stage: on-chain/data fetch (via cache)
     *
     * @param liquidityPool - The liquidity pool schema
     * @returns Dynamic liquidity pool information (CLMM or DLMM) from cache
     * @throws {CacheNotFoundException} When required dynamic cache entry is missing (from helper methods)
     */
    async getDynamicLiquidityPoolInfo(
        liquidityPool: LiquidityPoolSchema,
    ): Promise<DynamicLiquidityPoolInfoCacheResult> {
        // Route to appropriate cache fetch method based on pool type
        switch (liquidityPool.type) {
        case LiquidityPoolType.Clmm:
            return await this.getDynamicClmmLiquidityPoolInfo(liquidityPool)
        case LiquidityPoolType.Dlmm:
            return await this.getDynamicDlmmLiquidityPoolInfo(liquidityPool)
        }
    }
}
