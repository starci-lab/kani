// we use this interface to extend the coin object with the amount

import { ObjectRef, TransactionObjectArgument } from "@mysten/sui/transactions"
import BN from "bn.js"
import { TokenId } from "@modules/databases"
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
}

export type TransactionWithLifetime = Parameters<typeof signTransaction>[1]
export type SendAndConfirmTransactionType = Parameters<ReturnType<typeof sendAndConfirmTransactionFactory>>[0]