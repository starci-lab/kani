import {
    DynamicClmmLiquidityPoolInfoCacheResult, DynamicDlmmLiquidityPoolInfoCacheResult 
} from "@modules/cache"
import {
    LiquidityPoolId 
} from "@modules/databases"

export type WithLiquidityPoolId<T> = T & {
    liquidityPoolId: LiquidityPoolId
}
export type ClmmLiquidityPoolsSyncedEventPayload = WithLiquidityPoolId<DynamicClmmLiquidityPoolInfoCacheResult>
export type DlmmLiquidityPoolsSyncedEventPayload = WithLiquidityPoolId<DynamicDlmmLiquidityPoolInfoCacheResult>