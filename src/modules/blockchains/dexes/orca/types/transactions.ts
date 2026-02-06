import {
    BotSchema
} from "@modules/databases"
import {
    ClmmLiquidityPoolState
} from "../../types"
import BN from "bn.js"
import {
    Instruction
} from "@solana/kit"
import {
    KeyPairSigner,
    Address
} from "@solana/kit"

/**
 * Parameters for creating open position instructions.
 */
export interface CreateOpenPositionInstructionsParams {
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
 * Result of creating open position instructions.
 */
export interface CreateOpenPositionInstructionsResult {
    /** Array of instructions. */
    instructions: Array<Instruction>
    /** Mint key pair. */
    mintKeyPair: KeyPairSigner
    /** Personal position address. */
    personalPosition: Address
    /** ATA address. */
    ataAddress: Address
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
    /** Liquidity pool state. */
    state: ClmmLiquidityPoolState
}

/**
 * Parameters for getting position PDA.
 */
export interface GetPositionPdaParams {
    /** NFT mint address. */
    nftMintAddress: Address
    /** Program address. */
    programAddress: Address
}

/**
 * Result of getting position PDA.
 */
export interface GetPositionPdaResult {
    /** Position PDA address. */
    pda: Address
}

/**
 * Parameters for getting tick array PDA by start index.
 */
export interface GetTickArrayPdaByStartIndexParams {
    /** Pool state address. */
    poolStateAddress: Address
    /** Start index. */
    startIndex: BN
    /** Program address. */
    programAddress: Address
}

/**
 * Parameters for getting tick array PDA.
 */
export interface GetTickArrayPdaParams {
    /** Pool state address. */
    poolStateAddress: Address
    /** Tick index. */
    tickIndex: BN
    /** Tick spacing. */
    tickSpacing: BN
    /** Program address. */
    programAddress: Address
    /** Optional bot schema. */
    bot?: BotSchema
    /** Whether to return PDA only. */
    pdaOnly?: boolean
}

/**
 * Result of getting tick array PDA.
 */
export interface GetTickArrayPdaResult {
    /** Tick array PDA address. */
    pda: Address
    /** Start tick index. */
    startTickIndex?: BN
    /** Array of instructions (if initialization needed). */
    instructions?: Array<unknown>
}
