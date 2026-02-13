import type {
    Instruction,
    compileTransaction
} from "@solana/kit"
import type {
    Blockhash
} from "@solana/rpc-types"

/** Minimal bot shape for createSolanaTx (fee payer). */
export interface CreateSolanaTxBot {
    accountAddress: string
}

/** Result of getLatestBlockhash: blockhash and last valid block height for transaction lifetime. */
export interface LatestBlockhash {
    blockhash: Blockhash
    lastValidBlockHeight: bigint
}

/** Result of createSolanaTx: latest blockhash and compiled (unsigned) transaction. */
export interface CreateSolanaTxResult {
    latestBlockhash: LatestBlockhash
    transaction: ReturnType<typeof compileTransaction>
}

/** Params for building a Solana transaction with latest blockhash. */
export interface CreateSolanaTxParams {
    /** Bot whose accountAddress is used as fee payer */
    bot: CreateSolanaTxBot
    /** Instructions to include in the transaction */
    instructions: Array<Instruction>
}
