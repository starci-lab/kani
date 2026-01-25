// we use this interface to extend the coin object with the amount

import {
    ObjectRef, TransactionObjectArgument 
} from "@mysten/sui/transactions"
import BN from "bn.js"
import {
    LiquidityPoolId, TokenId 
} from "@modules/databases"
import {
    sendAndConfirmTransactionFactory, signTransaction 
} from "@solana/kit"
import {
    LiquidityPoolsSyncedEventPayload 
} from "@modules/event"

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
    liquidityPoolId: LiquidityPoolId
    eventPayload?: LiquidityPoolsSyncedEventPayload
}

export interface ClosePositionPayload extends BasePayload {
    liquidityPoolId: LiquidityPoolId
}

export interface ReconcileBalancePayload extends BasePayload {
    targetBalanceAmount?: BN
    quoteBalanceAmount?: BN
    gasBalanceAmount?: BN
}