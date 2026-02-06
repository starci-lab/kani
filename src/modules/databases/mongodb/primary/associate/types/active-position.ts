import type {
    BotSchema 
} from "../../schemas"

/** Params for attaching associated positions into each bot.activePosition. */
export interface AttachAssociatedPositionsToBotActivePositionsParams {
    bots: Array<BotSchema>
}

/** Result of attaching associated positions (mutates bots in place). */
export type AttachAssociatedPositionsToBotActivePositionsResult = void

/** Params for attaching associated liquidity pool into each bot.activePosition. */
export interface AttachAssociatedLiquidityPoolToBotActivePositionsParams {
    bots: Array<BotSchema>
    /** When true, attach pool analytics from cache when available. */
    withAnalytics?: boolean
}

/** Result of attaching associated liquidity pool (mutates bots in place). */
export type AttachAssociatedLiquidityPoolToBotActivePositionsResult = void
