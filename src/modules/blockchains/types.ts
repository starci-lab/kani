// we use this interface to extend the coin object with the amount

import {
    ObjectRef, TransactionObjectArgument 
} from "@mysten/sui/transactions"
import BN from "bn.js"
import {
    TokenId 
} from "@modules/databases"
import {
    sendAndConfirmTransactionFactory, signTransaction 
} from "@solana/kit"
import {
    DynamicLiquidityPoolInfoCacheResult 
} from "@modules/cache"

// to ensure the amount is correct
export interface CoinAsset {
    coinAmount: BN
    coinRef: ObjectRef
}

export type ExtendedCoinAsset = CoinAsset & { tokenId: TokenId }

export interface CoinArgument {
    coinAmount: BN
    coinArg: TransactionObjectArgument
    coinObjectId?: string
}

export type TransactionWithLifetime = Parameters<typeof signTransaction>[1]
export type SendAndConfirmTransactionType = Parameters<ReturnType<typeof sendAndConfirmTransactionFactory>>[0]

export enum GasStatus {
    IsTarget = "isTarget",
    IsQuote = "isQuote",
    IsGas = "isGas",
}

export interface BasePayload {
    jobId: string
    botId: string
    isRetry?: boolean
}

export interface OpenPositionPayload extends BasePayload {
    liquidityPoolId: string
    dynamicLiquidityPoolInfo?: DynamicLiquidityPoolInfoCacheResult
}

export interface ClosePositionPayload extends BasePayload {
    liquidityPoolId: string
    dynamicLiquidityPoolInfo?: DynamicLiquidityPoolInfoCacheResult
}

export interface ReconcileBalancePayload extends BasePayload {
    targetBalanceAmount?: BN
    quoteBalanceAmount?: BN
    gasBalanceAmount?: BN
}

export interface WithdrawTokenInput {
    tokenId: string
    amount: BN
}

export interface WithdrawPayload extends BasePayload {
    tokenInputs: Array<WithdrawTokenInput>
    toUsdc?: boolean
}