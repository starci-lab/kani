import {
    BotSchema
} from "@modules/databases"
import {
    DlmmLiquidityPoolState
} from "../../../interfaces"
import BN from "bn.js"
import {
    Instruction
} from "@solana/kit"
import {
    KeyPairSigner
} from "@solana/signers"

/**
 * Parameters for creating open position instructions.
 */
export interface CreateOpenPositionInstructionsParams {
    /** Bot schema. */
    bot: BotSchema
    /** DLMM liquidity pool state. */
    state: DlmmLiquidityPoolState
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
    positionKeyPair: KeyPairSigner
    /** Minimum bin ID. */
    minBinId: BN
    /** Maximum bin ID. */
    maxBinId: BN
    /** Fee amount for token A. */
    feeAmountA: BN
    /** Fee amount for token B. */
    feeAmountB: BN
}

/**
 * Parameters for creating close position instructions.
 */
export interface CreateCloseInstructionsParams {
    /** Bot schema. */
    bot: BotSchema
    /** DLMM liquidity pool state. */
    state: DlmmLiquidityPoolState
}
