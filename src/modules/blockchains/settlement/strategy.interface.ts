import {
    BotSchema 
} from "@modules/databases"
import {
    LiquidityPoolState 
} from "../interfaces"

export interface ISettlementStrategyService {
    settle(params: SettleParams): Promise<boolean>
}

export interface SettleParams {
    bot: BotSchema
    state: LiquidityPoolState
}