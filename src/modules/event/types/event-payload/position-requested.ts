import {
    ClmmLiquidityPoolsSyncedEventPayload,
    DlmmLiquidityPoolsSyncedEventPayload,
} from "./liquidity-pools"

export type ClmmPositionOpenRequestedEventPayload = ClmmLiquidityPoolsSyncedEventPayload
export type ClmmPositionCloseRequestedEventPayload = ClmmLiquidityPoolsSyncedEventPayload
export type DlmmPositionOpenRequestedEventPayload = DlmmLiquidityPoolsSyncedEventPayload
export type DlmmPositionCloseRequestedEventPayload = DlmmLiquidityPoolsSyncedEventPayload

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
