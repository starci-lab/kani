import {
    BotSchema,
    LiquidityPoolSchema
} from "@modules/databases"
import {
    DlmmLiquidityPoolState
} from "../../../types"
import BN from "bn.js"
import {
    Instruction
} from "@solana/kit"
import {
    Keypair
} from "@solana/web3.js"

/**
 * Parameters for creating open position instructions.
 */
export interface CreateOpenPositionInstructionsParams {
    /** Bot schema. */
    bot: BotSchema
    /** DLMM liquidity pool state. */
    state: DlmmLiquidityPoolState
    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema
    /** Amount of token A. */
    amountA: BN
    /** Amount of token B. */
    amountB: BN
}

/**
 * Result of creating open position instructions.
 */
export interface CreateOpenPositionInstructionsResult {
    /** Array of instructions. */
    instructions: Array<Instruction>
    /** Position key pair. */
    positionKeyPair: Keypair
    /** Minimum bin ID. */
    minBinId: BN
    /** Maximum bin ID. */
    maxBinId: BN
}

/**
 * Parameters for creating close position instructions.
 */
export interface CreateCloseInstructionsParams {
    /** Bot schema. */
    bot: BotSchema
    /** DLMM liquidity pool state. */
    state: DlmmLiquidityPoolState
    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema
}
