import {
    BotSchema,
    LiquidityPoolSchema,
    TransactionType
} from "@modules/databases"
import {
    Blockhash, 
    Instruction,
    BlockhashLifetimeConstraint,
} from "@solana/kit"
import {
    PrepareTx,
    SolanaTx,
    SolanaTxMessage, 
} from "../../../types"

/** Result of getLatestBlockhash: blockhash and last valid block height for transaction lifetime. */
export interface LatestBlockhash {
    blockhash: Blockhash
    lastValidBlockHeight: bigint
}

/** Params for building a Solana transaction with latest blockhash. */
export interface CreateSolanaTxMessageParams {
    /** Bot whose accountAddress is used as fee payer */
    bot: BotSchema
    /** Instructions to include in the transaction */
    instructions: Array<Instruction>
}

/** Params for signing a Solana transaction. */
export interface SignSolanaTxParams {
    /** Bot schema. */
    bot: BotSchema
    /** Prepared transaction. */
    prepareTx: PrepareTx
    /** Liquidity pool. */
    liquidityPool?: LiquidityPoolSchema
    /** Transaction type. */
    transactionType: TransactionType
}

/** Params for compiling a Solana transaction message. */
export interface CompileSolanaTxMessageParams {
    /** Bot schema. */
    bot: BotSchema
    /** Transaction message. */
    transactionMessage: SolanaTxMessage
}

/** Result of compiling a Solana transaction message. */
export interface CompileSolanaTxMessageResult {
    /** Compiled transaction. */
    transaction: SolanaTx
    /** Lifetime constraint. */
    lifetimeConstraint: BlockhashLifetimeConstraint
}