import {
    SuiEvent
} from "@mysten/sui/client"
import {
    BotSchema
} from "@modules/databases"
import {
    ClmmLiquidityPoolState
} from "../../../types"

/**
 * Represents the AddLiquidity event emitted by Momentum.
 */
export interface AddLiquidityEvent {
    /** Amount of token X. */
    amount_x: string
    /** Amount of token Y. */
    amount_y: string
    /** Liquidity provided. */
    liquidity: string
    /** Pool ID. */
    pool_id: string
    /** Position ID. */
    position_id: string
    /** Reserve X. */
    reserve_x: string
    /** Reserve Y. */
    reserve_y: string
    /** Sender address. */
    sender: string
}

/**
 * Result of parsing the AddLiquidity event.
 */
export interface ParseAddLiquidityEventResult {
    /** The ID of the newly created position. */
    positionId: string
}

/**
 * Parameters for parsing the AddLiquidity event.
 */
export interface ParseAddLiquidityEventParams {
    /** Array of Sui events from the transaction. */
    events?: Array<SuiEvent>
    /** The bot schema. */
    bot: BotSchema
    /** The transaction hash. */
    txHash: string
    /** The CLMM liquidity pool state. */
    state: ClmmLiquidityPoolState
}
