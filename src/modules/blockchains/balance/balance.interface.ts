/**
 * The core interface for any swap aggregator (Jupiter, Meteora, Raydium, etc.).
 * It returns a quote + executable swap data.
 */
export interface IBalanceService {
    evaluateBotBalances(params: EvaluateBotBalancesParams): Promise<EvaluateBotBalancesResponse>
}

import { BotSchema, TokenId } from "@modules/databases"
import BN from "bn.js"

export interface FetchBalanceParams {
    accountAddress: string
    tokenId: TokenId
    clientIndex?: number
}

export interface FetchBalanceResponse {
    balanceAmount: BN
}

export interface EvaluateBotBalancesParams {
    bot: BotSchema
}

export enum EvaluateBotBalancesStatus {
    OK = "ok",
    InsufficientTargetBalance = "InsufficientTargetBalance",
    InsufficientGasBalance = "InsufficientGasBalance",
    GasLowButConvertible = "GasLowButConvertible",
}

export interface EvaluateBotBalancesResponse {
    status: EvaluateBotBalancesStatus
    targetBalanceAmount?: BN
    quoteBalanceAmount?: BN
    gasBalanceAmount?: BN
    targetBalanceAmountSwapToQuote?: BN
    targetBalanceAmountSwapToGas?: BN
    isTerminate: boolean
}

export enum GasStatus {
    IsTarget = "isTarget",
    IsQuote = "isQuote",
    IsGas = "isGas",
}