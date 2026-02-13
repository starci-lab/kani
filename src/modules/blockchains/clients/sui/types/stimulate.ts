import type {
    TransactionType
} from "@modules/exceptions"
import type {
    LiquidityPoolId
} from "@modules/databases"
import type {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"

/** Minimal bot shape required for Sui stimulate (sender + exception context). */
export interface StimulateSuiBot {
    id: string
    accountAddress: string
}

/** Params for stimulating a Sui transaction (devInspect). Throws TransactionSubmitFailedException on failure. */
export interface StimulateSuiTransactionParams {
    signatureWithBytes: SignatureWithBytes
    bot: StimulateSuiBot
    transactionType: TransactionType
    liquidityPoolId?: LiquidityPoolId
}
