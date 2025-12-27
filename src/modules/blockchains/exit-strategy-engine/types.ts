import { BotSchema } from "@modules/databases"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"

export interface OutOfRangeExitCheckParams {
    bot: BotSchema
    state: LiquidityPoolState | DlmmLiquidityPoolState
}

export enum ExitStrategyEngineReason {
    OutOfRange = "outOfRange",
}