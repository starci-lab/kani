import {
    BotSchema, 
    TokenSchema
} from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    PrepareTx,
    SolanaTx 
} from "../interfaces"
import {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"
import {
    ComputeSwapAmountsResult 
} from "../math"

export interface BalanceOptions {
    enable?: {
        fetcher?: boolean
        action?: boolean
        enqueue?: boolean
    }
}

export interface BalanceWithdrawTokenInput {
    token: TokenSchema
    amount: BN
}

export interface PrepareWithdrawTransactionParams {
    bot: BotSchema
    tokenInputs: Array<BalanceWithdrawTokenInput>
    toAddress: string
    toUsdc?: boolean
}

export interface PrepareWithdrawTransactionResult {
    prepareTxs: Array<PrepareTx>
}

export interface ExecuteWithdrawTransactionParams {
    bot: BotSchema
    prepareTxs: Array<PrepareTx>
    isRetry?: boolean
    stimulate?: boolean
}

export interface ExecuteWithdrawTransactionResult {
    txHashes: Array<string>
}

export interface ExecuteReconcileBalanceTransactionParams {
    bot: BotSchema
    prepareTxs: Array<PrepareTx>
    isRetry?: boolean
    stimulate?: boolean
}

export interface ExecuteReconcileBalanceTransactionResults {
    txHashes: Array<string>
}

export interface BalanceReconcileBalanceTokenInput {
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    amount: BN
}

export interface PrepareReconcileBalanceTransactionParams {
    bot: BotSchema
    tokenInputs: Array<BalanceReconcileBalanceTokenInput>
}

export interface PrepareReconcileBalanceTransactionResult {
    prepareTxs: Array<PrepareTx>
}

/**
 * The core interface for balance action operations.
 */
export interface IBalanceActionService {
    prepareReconcileBalanceTransaction(params: PrepareReconcileBalanceTransactionParams): Promise<PrepareReconcileBalanceTransactionResult>
    executeReconcileBalanceTransaction(params: ExecuteReconcileBalanceTransactionParams): Promise<ExecuteReconcileBalanceTransactionResults>
    prepareWithdrawTransaction(params: PrepareWithdrawTransactionParams): Promise<PrepareWithdrawTransactionResult>
    executeWithdrawTransaction(params: ExecuteWithdrawTransactionParams): Promise<ExecuteWithdrawTransactionResult>
    determineReconcileBalancePlan(params: DetermineReconcileBalancePlanParams): Promise<DetermineReconcileBalancePlanResult>
}

/**
 * The core interface for balance fetcher operations.
 */
export interface IBalanceFetcherService {
    fetchBalance(params: FetchBalanceParams): Promise<FetchBalanceResult>
    fetchBalances(params: FetchBalancesParams): Promise<FetchBalancesResult>
    fetchTokens(params: FetchTokensParams): Promise<FetchTokensResult>
}

/**
 * The core interface for reconcile-balance enqueue operations.
 */
export interface IReconcileBalanceEnqueueService {
    enqueue(params: EnqueueReconcileBalanceParams): Promise<import("bullmq").Job<string>>
}

/**
 * The core interface for withdraw enqueue operations.
 */
export interface IWithdrawEnqueueService {
    enqueue(params: EnqueueWithdrawParams): Promise<import("bullmq").Job<string>>
}

export interface EnqueueReconcileBalanceParams {
    bot: BotSchema
    jobId: string
    isRetry?: boolean
}

export interface EnqueueWithdrawParams {
    bot: BotSchema
    jobId: string
    isRetry?: boolean
    tokenInputs: Array<BalanceWithdrawTokenInput>
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
    incentiveTokens?: Array<TokenSchema>
}

export interface FetchBalancesResult {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
    incentiveBalanceAmounts: Record<string, BN>
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
    txCheck: boolean
    stimulate?: boolean
}

export interface GetBalanceAmountInUsdParams {
    bot: BotSchema
}

export interface GetBalanceAmountInUsdResult {
    balanceAmountInUsd: Decimal
}

export interface FetchTokensParams {
    bot: BotSchema
}

export interface FetchTokensResult {
    tokens: Array<TokenBalance>
}

export interface TokenBalance {
    token: TokenSchema
    balanceAmount: BN
    balanceAmountDecimal: Decimal
}