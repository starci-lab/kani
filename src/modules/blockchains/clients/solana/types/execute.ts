import type {
    SignedTx
} from "@modules/blockchains"
import type {
    TransactionType,
    LiquidityPoolId
} from "@modules/databases"

/** Minimal bot shape for execute (exception context). */
export interface ExecuteSolanaBot {
    id: string
}

/** Params for executing a Solana transaction on-chain. */
export interface ExecuteSolanaTransactionParams {
    signedTx: SignedTx
    bot: ExecuteSolanaBot
    transactionType: TransactionType
    liquidityPoolId?: LiquidityPoolId
}

/** Result of executing a Solana transaction. */
export interface ExecuteSolanaTransactionResult {
    txHash: string
    signature: string
}
