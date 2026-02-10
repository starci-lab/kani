import {
    LiquidityPoolId 
} from "@modules/databases"

/**
 * Not synced process open position message.
 */
export interface NotSyncedProcessOpenPositionMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Not synced process close position message.
 */
export interface NotSyncedProcessClosePositionMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}