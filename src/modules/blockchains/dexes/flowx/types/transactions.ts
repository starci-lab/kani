import {
    Transaction
} from "@mysten/sui/transactions"
import BN from "bn.js"
import {
    ClmmLiquidityPoolState,
    BotSchema
} from "../../../types"

/**
 * Parameters for creating open position transaction builder.
 */
export interface CreateOpenPositionTxbParams {
    /** Optional transaction builder. */
    txb?: Transaction
    /** Bot schema. */
    bot: BotSchema
    /** CLMM liquidity pool state. */
    state: ClmmLiquidityPoolState
    /** Lower tick value. */
    tickLower: BN
    /** Upper tick value. */
    tickUpper: BN
    /** Liquidity amount. */
    liquidity: BN
    /** Amount of token A. */
    amountA: BN
    /** Amount of token B. */
    amountB: BN
}

/**
 * Result of creating open position transaction builder.
 */
export interface CreateOpenPositionTxbResult {
    /** Transaction builder. */
    txb: Transaction
    /** Fee amount for token A. */
    feeAmountA: BN
    /** Fee amount for token B. */
    feeAmountB: BN
}

/**
 * Parameters for creating close position transaction builder.
 */
export interface CreateClosePositionTxbParams {
    /** Optional transaction builder. */
    txb?: Transaction
    /** Bot schema. */
    bot: BotSchema
    /** CLMM liquidity pool state. */
    state: ClmmLiquidityPoolState
}

/**
 * Result of creating close position transaction builder.
 */
export interface CreateClosePositionTxbResult {
    /** Transaction builder. */
    txb: Transaction
}
