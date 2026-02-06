import type BN from "bn.js"
import type {
    Transaction, TransactionResult 
} from "@mysten/sui/transactions"
import type {
    CoinAsset 
} from "../../types"

/** Params for fetching coins by owner and coin type. */
export interface FetchCoinsParams {
    owner: string
    coinType: string
}

/** Result of fetch coins: list of coin assets and total balance. */
export interface FetchCoinsResult {
    coinAssets: Array<CoinAsset>
    totalBalance: BN
}

/** Params for resolving/merging multiple coin assets into one for a transaction. */
export interface ResolveCoinAssetParams {
    coinAssets: Array<CoinAsset>
    txb: Transaction
}

/** Result of resolve coin asset: selected coin and optional merge transaction result. */
export interface ResolveCoinAssetResult {
    coinAsset: CoinAsset
    txResult?: TransactionResult
}
