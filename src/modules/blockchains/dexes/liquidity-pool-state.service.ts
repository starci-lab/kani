import {
    LiquidityPoolSchema, LiquidityPoolType 
} from "@modules/databases"
import {
    CacheService, 
    CacheKey
} from "@modules/cache"
import {
    Injectable 
} from "@nestjs/common"
import {
    DlmmLiquidityPoolState, ClmmLiquidityPoolState 
} from "../interfaces"
import { 
    CacheNotFoundException,
} from "@modules/exceptions"

@Injectable()
export class LiquidityPoolStateService {
    constructor(
        private readonly cacheService: CacheService,
    ) {}

    private async getClmmState(
        liquidityPool: LiquidityPoolSchema,
    ): Promise<ClmmLiquidityPoolState> {
        const dynamicLiquidityPoolInfoCacheResult = await this.cacheService.get(
            {
                key: CacheKey.DynamicClmmLiquidityPoolInfo,
                args: [liquidityPool.id.toString()],
            }
        )
        if (!dynamicLiquidityPoolInfoCacheResult) throw new CacheNotFoundException({
            key: CacheKey.DynamicClmmLiquidityPoolInfo,
            args: [liquidityPool.id.toString()],
        })
        return {
            static: liquidityPool,
            dynamic: dynamicLiquidityPoolInfoCacheResult,
        }
    }

    private async getDlmmState(
        liquidityPool: LiquidityPoolSchema,
    ): Promise<DlmmLiquidityPoolState> {
        const dynamicLiquidityPoolInfoCacheResult = await this.cacheService.get(
            {
                key: CacheKey.DynamicDlmmLiquidityPoolInfo,
                args: [liquidityPool.id],
            }
        )
        if (!dynamicLiquidityPoolInfoCacheResult) throw new CacheNotFoundException({
            key: CacheKey.DynamicDlmmLiquidityPoolInfo,
            args: [liquidityPool.id.toString()],
        })
        return {
            static: liquidityPool,
            dynamic: dynamicLiquidityPoolInfoCacheResult,
        }
    }   

    async getState(
        liquidityPool: LiquidityPoolSchema,
    ): Promise<
    ClmmLiquidityPoolState | DlmmLiquidityPoolState
    > {
        switch (liquidityPool.type) {
        case LiquidityPoolType.Clmm:
            return await this.getClmmState(liquidityPool)
        case LiquidityPoolType.Dlmm:
            return await this.getDlmmState(liquidityPool)
        }
    }
}