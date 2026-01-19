import {
    DynamicClmmLiquidityPoolInfoCacheResult, DynamicDlmmLiquidityPoolInfoCacheResult 
} from "@modules/cache"
import {
    RpcEjection 
} from "@modules/databases"

export type WithId<T> = T & {
    id: string
}
export type ClmmLiquidityPoolsSyncedEventPayload = WithId<DynamicClmmLiquidityPoolInfoCacheResult>
export type DlmmLiquidityPoolsSyncedEventPayload = WithId<DynamicDlmmLiquidityPoolInfoCacheResult>
export type ReinitializeBalancersEventPayload = Array<RpcEjection>