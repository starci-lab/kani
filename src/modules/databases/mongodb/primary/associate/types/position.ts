import type {
    BotSchema, PositionSchema 
} from "../../schemas"

/** Params for associating active position (and its associated position) to a bot. */
export interface AssociateActivePositionParams {
    bot: BotSchema
}

/** Result of associating active position (mutates bot in place). */
export type AssociateActivePositionResult = void

/** Params for associating liquidity pool to a position. */
export interface AssociateLiquidityPoolParams {
    position: PositionSchema
}

/** Result of associating liquidity pool (mutates position in place). */
export type AssociateLiquidityPoolResult = void
