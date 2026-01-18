import {
    DynamicClmmLiquidityPoolInfoCacheResult, DynamicDlmmLiquidityPoolInfoCacheResult 
} from "@modules/cache"

export type WithId<T> = T & {
    id: string
}
export type ClmmLiquidityPoolsSyncedEventPayload = WithId<DynamicClmmLiquidityPoolInfoCacheResult>
export type DlmmLiquidityPoolsSyncedEventPayload = WithId<DynamicDlmmLiquidityPoolInfoCacheResult>