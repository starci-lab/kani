import {
    BotSchema,
    PositionSettlementReason, 
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    LiquidityPoolState 
} from "../types"

export interface ISettlementStrategyService {
    settle(params: SettleParams): Promise<SettleStrategyResult>
}

export interface SettleParams {
    bot: BotSchema
    state: LiquidityPoolState
    liquidityPool: LiquidityPoolSchema
}

export interface SettleStrategyResult {
    reason: PositionSettlementReason
    settled: boolean
    metadata?: unknown
}