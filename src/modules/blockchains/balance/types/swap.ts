import {
    BotSchema, 
    TokenSchema
} from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    SolanaTx 
} from "../../interfaces"
import {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"

/** Parameters for processing a transfer fees transaction. */
export interface ProcessTransferFeesTransactionParams {
    bot: BotSchema
    roi: Decimal
    clientIndex?: number
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
}

/** Result of processing transfer fees. */
export interface ProcessTransferFeesResult {
    txHash: string
    targetFeeAmount: BN
    quoteFeeAmount: BN
}

/** Parameters for processing a swap transaction. */
export interface ProcessSwapTransactionParams {
    bot: BotSchema
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    amountIn: BN
    estimatedSwappedAmount: BN
}

/** Result of processing a swap transaction. */
export interface ProcessSwapTransactionResult {
    txHash: string
}

/** Parameters for preparing a swap transaction. */
export interface PrepareSwapTransactionParams {
    bot: BotSchema
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    amountIn: BN
    estimatedSwappedAmount: BN
}

/** Result of preparing a swap transaction. */
export interface PrepareSwapTransactionResult {
    txHash: string
    solanaTx?: SolanaTx // Solana Transaction object
    signatureWithBytes?: SignatureWithBytes
    tokenIn: TokenSchema
    tokenOut: TokenSchema
}

/** Parameters for executing a swap transaction. */
export interface ExecuteSwapTransactionParams {
    bot: BotSchema
    txHash: string
    solanaTx?: SolanaTx // Solana Transaction object
    signatureWithBytes?: SignatureWithBytes
    txCheck: boolean
    stimulate?: boolean
}
