import type {
    SignedTx
} from "@modules/blockchains"
import type {
    LiquidityPoolId
} from "@modules/databases"
import type {
    TransactionType
} from "@modules/exceptions"

/** Minimal bot shape required for Solana stimulate (exception context). */
export interface StimulateSolanaBot {
    id: string
}

/** Params for stimulating a Solana transaction. Throws TransactionSubmitFailedException on failure. */
export interface StimulateSolanaTransactionParams {
    signedTx: SignedTx
    bot: StimulateSolanaBot
    transactionType: TransactionType
    liquidityPoolId?: LiquidityPoolId
}

/** Result of stimulating a Solana transaction. */
export interface StimulateSolanaTransactionResult {
    txHash: string
    signature: string
}