import type {
    LiquidityPoolId
} from "@modules/databases"
import type {
    TransactionType
} from "@modules/exceptions"
import type {
    SolanaTx
} from "../../../types"

/** Minimal bot shape required for Solana stimulate (exception context). */
export interface StimulateSolanaBot {
    id: string
}

/** Params for stimulating a Solana transaction. Throws TransactionSubmitFailedException on failure. */
export interface StimulateSolanaTransactionParams {
    solanaTx: SolanaTx
    bot: StimulateSolanaBot
    transactionType: TransactionType
    liquidityPoolId?: LiquidityPoolId
}

/** Result of stimulating a Solana transaction. */
export interface StimulateSolanaTransactionResult {
    txHash: string
}