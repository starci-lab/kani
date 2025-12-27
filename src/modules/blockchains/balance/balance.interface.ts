import { BotSchema, TokenId, TokenSchema } from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"
import { SolanaTx } from "../interfaces"
import { Transaction } from "@mysten/sui/transactions"
import { SignatureWithBytes } from "@mysten/sui/cryptography"

/**
 * The core interface for any swap aggregator (Jupiter, Meteora, Raydium, etc.).
 * It returns a quote + executable swap data.
 */
export interface IBalanceService {
    fetchBalance(params: FetchBalanceParams): Promise<FetchBalanceResponse>
    prepareSwapTransaction(params: PrepareSwapTransactionParams): Promise<PrepareSwapTransactionResponse>
    executeSwapTransaction(params: ExecuteSwapTransactionParams): Promise<void>
}

export interface DetermineReconcileBalancePlanParams {
    bot: BotSchema
    // if you pass those params, we will not fetch the balances from on-chain
    snapshotTargetBalanceAmount?: BN
    snapshotQuoteBalanceAmount?: BN
    snapshotGasBalanceAmount?: BN
}

export interface DetermineReconcileBalancePlanResponse {
    needsSwap: boolean
    needsSnapshot: boolean
    swapDirection?: "targetToQuote" | "quoteToTarget"
    tokenIn?: TokenSchema
    tokenOut?: TokenSchema
    amountIn?: BN
    estimatedSwappedAmount?: BN
}
export interface FetchBalanceParams {
    bot: BotSchema
    tokenId: TokenId
}

export interface FetchBalanceResponse {
    balanceAmount: BN
}

export enum GasStatus {
    IsTarget = "isTarget",
    IsQuote = "isQuote",
    IsGas = "isGas",
}

export interface FetchBalancesParams {
    bot: BotSchema
}

export interface FetchBalancesResponse {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
}

export interface ProcessTransferFeesTransactionParams {
    bot: BotSchema
    roi: Decimal
    clientIndex?: number
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
}

export interface ProcessTransferFeesResponse {
    txHash: string
    targetFeeAmount: BN
    quoteFeeAmount: BN
}

export interface ProcessSwapTransactionParams {
    bot: BotSchema
    tokenIn: TokenId
    tokenOut: TokenId
    amountIn: BN
    estimatedSwappedAmount: BN
}

export interface ProcessSwapTransactionResponse {
    txHash: string
}

export interface PrepareSwapTransactionParams {
    bot: BotSchema
    tokenIn: TokenId
    tokenOut: TokenId
    amountIn: BN
    estimatedSwappedAmount: BN
}

export interface PrepareSwapTransactionResponse {
    txHash: string
    solanaTx?: SolanaTx // Solana Transaction object
    signatureWithBytes?: SignatureWithBytes
    txb?: Transaction
}

export interface ExecuteSwapTransactionParams {
    bot: BotSchema
    txHash: string
    solanaTx?: SolanaTx // Solana Transaction object
    txb?: Transaction // Sui Transaction object
    isRetry: boolean
    tokenIn: TokenId
    tokenOut: TokenId
}

export interface EnqueueBalanceRebalancingParams {
    bot: BotSchema
}