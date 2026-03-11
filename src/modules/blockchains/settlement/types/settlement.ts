import type {
    BotSchema,
    LiquidityPoolSchema,
    PositionSettlementReason,
    PositionSettlementSchema,
} from "@modules/databases"
import type {
    LiquidityPoolState,
} from "../../types"

/** Strategy service contract for a single settlement condition. */
export interface ISettlementStrategyService {
    settle(params: SettleParams): Promise<SettleStrategyResult>
}

/** Params for running settlement checks (bot, pool state, pool). */
export interface SettleParams {
    bot: BotSchema
    state: LiquidityPoolState
    liquidityPool: LiquidityPoolSchema
}

/** Result of a single settlement strategy (e.g. out-of-range or violate indicators). */
export interface SettleStrategyResult {
    reason: PositionSettlementReason
    settled: boolean
    metadata?: unknown
}

/** Result of running all settlement strategies. */
export interface SettleResult {
    settled: boolean
    positionSettlements: Array<Partial<PositionSettlementSchema>>
}
