import {
    LiquidityPoolSchema 
} from "@modules/databases"
import {
    DynamicClmmLiquidityPoolInfoCacheResult, 
    DynamicDlmmLiquidityPoolInfoCacheResult
} from "@modules/cache"

/** CLMM liquidity pool state with static and dynamic data. */
export interface ClmmLiquidityPoolState {
    static: LiquidityPoolSchema;
    dynamic: DynamicClmmLiquidityPoolInfoCacheResult;
}

/** DLMM liquidity pool state with static and dynamic data. */
export interface DlmmLiquidityPoolState {
    static: LiquidityPoolSchema;
    dynamic: DynamicDlmmLiquidityPoolInfoCacheResult;
}

/** Union type for liquidity pool state (CLMM or DLMM). */
export type LiquidityPoolState = ClmmLiquidityPoolState | DlmmLiquidityPoolState;
