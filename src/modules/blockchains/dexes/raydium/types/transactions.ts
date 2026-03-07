import {
    BotSchema,
    LiquidityPoolSchema
} from "@modules/databases"
import {
    ClmmLiquidityPoolState
} from "../../../types/pool-state"
import {
    Instruction
} from "@solana/kit"
import {
    Address
} from "@solana/kit"
import BN from "bn.js"
import {
    Keypair 
} from "@solana/web3.js"

/**
 * Parameters for creating open position instructions.
 */
export interface CreateOpenPositionInstructionsParams {
    /** Bot schema. */
    bot: BotSchema
    /** CLMM liquidity pool state. */
    state: ClmmLiquidityPoolState
    /** Liquidity amount. */
    liquidity: BN
    /** Maximum amount of token A. */
    amountAMax: BN
    /** Maximum amount of token B. */
    amountBMax: BN
    /** Lower tick value. */
    tickLower: BN
    /** Upper tick value. */
    tickUpper: BN
    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema
}

/**
 * Result of creating open position instructions.
 */
export interface CreateOpenPositionInstructionsResult {
    /** Array of instructions. */
    instructions: Array<Instruction>
    /** Position key pair. */
    positionKeyPair: Keypair
    /** Personal position address. */
    personalPosition: Address
    /** ATA address. */
    ataAddress: Address
}

/**
 * Parameters for creating close position instructions.
 */
export interface CreateCloseInstructionsParams {
    /** Bot schema. */
    bot: BotSchema
    /** CLMM liquidity pool state. */
    state: ClmmLiquidityPoolState
    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema
}

/**
 * Parameters for getting personal position PDA.
 */
export interface GetPersonalPositionPdaParams {
    /** NFT mint address. */
    nftMintAddress: Address
    /** Program address. */
    programAddress: Address
}

/**
 * Result of getting personal position PDA.
 */
export interface GetPersonalPositionPdaResult {
    /** Position PDA address. */
    pda: Address
}

/**
 * Parameters for verifying personal position PDA.
 */
export interface VerifyPersonalPositionPdaParams {
    /** NFT mint address. */
    nftMintAddress: Address
    /** Program address. */
    programAddress: Address
    /** Candidate PDA address. */
    candidate: Address
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
}

/**
 * Result of getting tick array PDA.
 */
export interface GetTickArrayPdaResult {
    /** Tick array PDA address. */
    pda: Address
}
