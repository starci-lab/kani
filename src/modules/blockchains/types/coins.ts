import {
    ObjectRef, TransactionObjectArgument 
} from "@mysten/sui/transactions"
import BN from "bn.js"
import {
    TokenId 
} from "@modules/databases"

/** Coin asset with amount and reference. */
export interface CoinAsset {
    coinAmount: BN
    coinRef: ObjectRef
}

/** Extended coin asset with token ID. */
export type ExtendedCoinAsset = CoinAsset & { tokenId: TokenId }

/** Coin argument for transactions. */
export interface CoinArgument {
    coinAmount: BN
    coinArg: TransactionObjectArgument
    coinObjectId?: string
}
