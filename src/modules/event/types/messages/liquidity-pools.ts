import {
    DynamicClmmLiquidityPoolInfoCacheResult,
    DynamicDlmmLiquidityPoolInfoCacheResult,
} from "@modules/cache"
import {
    WithId,
} from "./base"

export type ClmmLiquidityPoolsSyncedEventPayload = WithId<DynamicClmmLiquidityPoolInfoCacheResult>
export type DlmmLiquidityPoolsSyncedEventPayload = WithId<DynamicDlmmLiquidityPoolInfoCacheResult>
export type LiquidityPoolsSyncedEventPayload =
    | ClmmLiquidityPoolsSyncedEventPayload
    | DlmmLiquidityPoolsSyncedEventPayload

export interface LiquidityPoolsBecameReadyEventPayload {
    ids: Array<string>
}

export interface LiquidityPoolsBecameNotReadyEventPayload {
    ids: Array<string>
}
