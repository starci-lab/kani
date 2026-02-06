import {
    LiquidityPoolId,
} from "@modules/databases"

export interface LiquidityPoolSyncAge {
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

export interface LiquidityPoolsBecameReadyMessage {
    syncAges: Array<LiquidityPoolSyncAge>
}

export interface LiquidityPoolsBecameNotReadyMessage {
    syncAges: Array<LiquidityPoolSyncAge>
}

export interface ClmmLiquidityPoolsSyncedDiagnosticMessage {
    id: string
}

export interface DlmmLiquidityPoolsSyncedDiagnosticMessage {
    id: string
}

export interface CannotSettlePositionMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    strategyResults: unknown
}
