import type BN from "bn.js"
import type {
    Transaction 
} from "@mysten/sui/transactions"
import type {
    CoinAsset, CoinArgument 
} from "../../types"

/** Params for selecting coins whose total is >= amount, with optional exclude list. */
export interface SelectCoinAssetGreaterThanOrEqualParams {
    coins: Array<CoinAsset>
    amount: BN
    exclude: Array<string>
}

/** Result of select coins: selected coins and remaining coins. */
export interface SelectCoinAssetGreaterThanOrEqualResult {
    selectedCoins: Array<CoinAsset>
    remainingCoins: Array<CoinAsset>
}

/** Params for fetching coins, merging, and optionally reserving SUI for gas. */
export interface FetchAndMergeCoinsParams {
    txb?: Transaction
    owner: string
    coinType: string
    suiGasAmount?: BN
    requiredAmount?: BN
}

/** Result of fetch and merge coins: source coin argument and balance. */
export interface FetchAndMergeCoinsResult {
    sourceCoin: CoinArgument
    balance: BN
}

/** Params for splitting a coin into spend amount and remainder. */
export interface SplitCoinParams {
    txb?: Transaction
    sourceCoin: CoinArgument
    requiredAmount: BN
}

/** Result of split coin: the spend coin argument. */
export interface SplitCoinResult {
    spendCoin: CoinArgument
}
