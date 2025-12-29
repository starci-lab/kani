// we use this interface to extend the coin object with the amount

import { ObjectRef, TransactionObjectArgument } from "@mysten/sui/transactions"
import BN from "bn.js"
import { BotSchema, TokenId } from "@modules/databases"
import { sendAndConfirmTransactionFactory, signTransaction } from "@solana/kit"

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

export interface DynamicLiquidityPoolInfo {
    tickCurrent: number
    liquidity: BN
    sqrtPriceX64: BN
    rewards: Array<unknown>
}

export interface DynamicDlmmLiquidityPoolInfo {
    activeId: number
    rewards: Array<unknown>
}

export type TransactionWithLifetime = Parameters<typeof signTransaction>[1]
export type SendAndConfirmTransactionType = Parameters<ReturnType<typeof sendAndConfirmTransactionFactory>>[0]

export enum GasStatus {
    IsTarget = "isTarget",
    IsQuote = "isQuote",
    IsGas = "isGas",
}

export interface BasePayload {
    bot: BotSchema
}

export interface OpenPositionPayload extends BasePayload {
    jobId: string
    state: string
    bot: BotSchema
}

export interface ClosePositionPayload extends BasePayload {
    jobId: string
    state: string
    bot: BotSchema
}

export interface ReconcileBalancePayload extends BasePayload {
    jobId: string
    bot: BotSchema
    targetBalanceAmount?: BN
    quoteBalanceAmount?: BN
    gasBalanceAmount?: BN
}