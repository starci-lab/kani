import {
    BotSchema, TokenSchema 
} from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    SolanaTx 
} from "../interfaces"
import {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"
import {
    ComputeSwapAmountsResult 
} from "../math"

/**
 * The core interface for any swap aggregator (Jupiter, Meteora, Raydium, etc.).
 * It returns a quote + executable swap data.
 */
export interface IBalanceService {
    fetchBalance(params: FetchBalanceParams): Promise<FetchBalanceResult>
    prepareSwapTransaction(params: PrepareSwapTransactionParams): Promise<PrepareSwapTransactionResult>
    executeSwapTransaction(params: ExecuteSwapTransactionParams): Promise<void>
}

export interface DetermineReconcileBalancePlanParams {
    bot: BotSchema
    // if you pass those params, we will not fetch the balances from on-chain
    targetBalanceAmount?: BN
    quoteBalanceAmount?: BN
    gasBalanceAmount?: BN
}

export type DetermineReconcileBalancePlanResult = ComputeSwapAmountsResult

export interface FetchBalanceParams {
    bot: BotSchema
    token: TokenSchema
}

export interface FetchBalanceResult {
    balanceAmount: BN
}

export interface FetchBalancesParams {
    bot: BotSchema
}

export interface FetchBalancesResult {
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

export interface ProcessTransferFeesResult {
    txHash: string
    targetFeeAmount: BN
    quoteFeeAmount: BN
}

export interface ProcessSwapTransactionParams {
    bot: BotSchema
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    amountIn: BN
    estimatedSwappedAmount: BN
}

export interface ProcessSwapTransactionResult {
    txHash: string
}

export interface PrepareSwapTransactionParams {
    bot: BotSchema
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    amountIn: BN
    estimatedSwappedAmount: BN
}

export interface PrepareSwapTransactionResult {
    txHash: string
    solanaTx?: SolanaTx // Solana Transaction object
    signatureWithBytes?: SignatureWithBytes
    tokenIn: TokenSchema
    tokenOut: TokenSchema
}

export interface ExecuteSwapTransactionParams {
    bot: BotSchema
    txHash: string
    solanaTx?: SolanaTx // Solana Transaction object
    signatureWithBytes?: SignatureWithBytes
    tokenIn: TokenSchema
    tokenOut: TokenSchema
}

export interface EnqueueBalanceRebalancingParams {
    bot: BotSchema
    jobId: string
}

export interface GetBalanceAmountInUsdParams {
    bot: BotSchema
}

export interface GetBalanceAmountInUsdResult {
    balanceAmountInUsd: Decimal
}