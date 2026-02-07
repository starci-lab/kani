import {
    DynamicClmmLiquidityPoolInfoCacheResult, 
    DynamicDlmmLiquidityPoolInfoCacheResult
} from "@modules/cache"

/** CLMM liquidity pool state with static and dynamic data. */
export type ClmmLiquidityPoolState = DynamicClmmLiquidityPoolInfoCacheResult

/** DLMM liquidity pool state with static and dynamic data. */
export type DlmmLiquidityPoolState = DynamicDlmmLiquidityPoolInfoCacheResult

/** Union type for liquidity pool state (CLMM or DLMM). */
export type LiquidityPoolState = ClmmLiquidityPoolState | DlmmLiquidityPoolState;
