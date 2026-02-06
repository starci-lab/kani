import {
    ClmmLiquidityPoolState,
    BotSchema
} from "../../../interfaces"
import {
    SuiEvent
} from "@mysten/sui/client"

/**
 * Event data for IncreaseLiquidity event in FlowX.
 */
export interface IncreaseLiquidityEvent {
    /** Amount of token X. */
    amount_x: string
    /** Amount of token Y. */
    amount_y: string
    /** Liquidity amount. */
    liquidity: string
    /** Pool ID. */
    pool_id: string
    /** Position ID. */
    position_id: string
    /** Sender address. */
    sender: string
}

/**
 * Result of parsing increase liquidity event.
 */
export interface ParseIncreaseLiquidityEventResult {
    /** Position ID extracted from event. */
    positionId: string
}

/**
 * Parameters for parsing increase liquidity event.
 */
export interface ParseIncreaseLiquidityEventParams {
    /** CLMM liquidity pool state. */
    state: ClmmLiquidityPoolState
    /** Array of Sui events. */
    events?: Array<SuiEvent>
    /** Bot schema. */
    bot: BotSchema
    /** Transaction hash. */
    txHash: string
}
