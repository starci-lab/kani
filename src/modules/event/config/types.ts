import {
    DynamicClmmLiquidityPoolInfoCacheResult, DynamicDlmmLiquidityPoolInfoCacheResult 
} from "@modules/cache"
import {
    BotSchema,
    RpcEjection 
} from "@modules/databases"
import {
    ExecutorSchema 
} from "@modules/databases"

export type WithId<T> = T & {
    id: string
}
export type ClmmLiquidityPoolsSyncedEventPayload = WithId<DynamicClmmLiquidityPoolInfoCacheResult>
export type DlmmLiquidityPoolsSyncedEventPayload = WithId<DynamicDlmmLiquidityPoolInfoCacheResult>
export type LiquidityPoolsSyncedEventPayload = ClmmLiquidityPoolsSyncedEventPayload | DlmmLiquidityPoolsSyncedEventPayload
export type ReinitializeBalancersEventPayload = Array<RpcEjection>
export interface CoordinatorExecutorCreatedEventPayload {
    id: string
}
export interface CoordinatorExecutorDeletedEventPayload {
    id: string
}
export type CoordinatorExecutorUpdatedEventPayload = ExecutorSchema

export type ClmmPositionOpenRequestedEventPayload = ClmmLiquidityPoolsSyncedEventPayload
export type ClmmPositionCloseRequestedEventPayload = ClmmLiquidityPoolsSyncedEventPayload
export type DlmmPositionOpenRequestedEventPayload = DlmmLiquidityPoolsSyncedEventPayload
export type DlmmPositionCloseRequestedEventPayload = DlmmLiquidityPoolsSyncedEventPayload

export type ExecutorBotUpdatedEventPayload = BotSchema
export interface ExecutorBotCreatedEventPayload {
    id: string
}
export interface ExecutorBotDeletedEventPayload {
    id: string
}

export interface LockAuthorityTimeoutEventPayload {
    botId: string
}

export interface LiquidityPoolsBecameReadyEventPayload {
    ids: Array<string>
}
export interface LiquidityPoolsBecameNotReadyEventPayload {
    ids: Array<string>
}

export interface ClmmPositionOpenWithoutEventRequestedEventPayload {
    id: string
}
export interface ClmmPositionCloseWithoutEventRequestedEventPayload {
    id: string
}
export interface DlmmPositionOpenWithoutEventRequestedEventPayload {
    id: string
}
export interface DlmmPositionCloseWithoutEventRequestedEventPayload {
    id: string
}