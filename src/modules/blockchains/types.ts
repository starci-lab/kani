// we use this interface to extend the coin object with the amount

import { ObjectRef, TransactionObjectArgument } from "@mysten/sui/transactions"
import BN from "bn.js"
import { BotSchema, LiquidityPoolId, TokenId } from "@modules/databases"
import { sendAndConfirmTransactionFactory, signTransaction } from "@solana/kit"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "./interfaces"

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

export interface OpenPositionConfirmationPayload {
    // The bot ID used to identify the bot that created the position
    bot: BotSchema
    // The transaction hash used to retry and identify the transaction that opened the position
    txHash: string
    // The liquidity pool ID to identify the liquidity pool where the position was opened
    state: LiquidityPoolState | DlmmLiquidityPoolState
    // The position ID to identify the opened position
    positionId: string
    // Snapshot of the target balance amount before opening the position
    snapshotTargetBalanceAmountBeforeOpen: string
    // Snapshot of the quote balance amount before opening the position
    snapshotQuoteBalanceAmountBeforeOpen: string
    // Snapshot of the gas balance amount before opening the position
    snapshotGasBalanceAmountBeforeOpen: string
    // liquidity amount
    liquidity?: string
    // fee amount for the target token
    feeAmountTarget: string
    // fee amount for the quote token
    feeAmountQuote: string
    // tick lower
    tickLower?: number
    // tick upper
    tickUpper?: number
    // bin min id
    minBinId?: number
    // bin max id
    maxBinId?: number
    // amount a
    amountA?: string
    // amount b
    amountB?: string
}