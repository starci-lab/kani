import {
    BotSchema 
} from "@modules/databases"
import {
    ClmmLiquidityPoolState,
} from "../../../types"
import {
    SuiEvent
} from "@mysten/sui/client"

/**
 * Add liquidity V2 event from Cetus.
 */
export interface AddLiquidityV2Event {
    /** Liquidity after the operation. */
    after_liquidity: string
    /** Amount of token A. */
    amount_a: string
    /** Amount of token B. */
    amount_b: string
    /** Current sqrt price. */
    current_sqrt_price: string
    /** Liquidity amount. */
    liquidity: string
    /** Pool address. */
    pool: string
    /** Position address. */
    position: string
}

/**
 * Result of parsing add liquidity event.
 */
export interface ParseAddLiquidityEventResult {
    /** Position ID. */
    positionId: string
}

/**
 * Parameters for parsing add liquidity event.
 */
export interface ParseAddLiquidityEventParams {
    /** CLMM liquidity pool state. */
    state: ClmmLiquidityPoolState
    /** Array of Sui events. */
    events?: Array<SuiEvent>
    /** Bot schema. */
    bot: BotSchema
    /** Transaction hash. */
    txHash: string
}
