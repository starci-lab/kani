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
export type ReinitializeBalancersEventPayload = Array<RpcEjection>
export interface CoordinatorExecutorCreatedEventPayload {
    id: string
}
export interface CoordinatorExecutorDeletedEventPayload {
    id: string
}
export type CoordinatorExecutorUpdatedEventPayload = ExecutorSchema

export interface ClmmPositionOpenRequestedEventPayload {
    payload: ClmmLiquidityPoolsSyncedEventPayload
    bot: BotSchema
}

export interface ClmmPositionCloseRequestedEventPayload {
    payload: ClmmLiquidityPoolsSyncedEventPayload
    bot: BotSchema
}

export interface DlmmPositionOpenRequestedEventPayload {
    payload: DlmmLiquidityPoolsSyncedEventPayload
    bot: BotSchema
}

export interface DlmmPositionCloseRequestedEventPayload {
    payload: DlmmLiquidityPoolsSyncedEventPayload
    bot: BotSchema
}

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