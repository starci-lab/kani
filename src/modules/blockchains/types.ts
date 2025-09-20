// we use this interface to extend the coin object with the amount

import { ObjectRef, TransactionObjectArgument } from "@mysten/sui/transactions"
import BN from "bn.js"
import { TokenId } from "@modules/databases"

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