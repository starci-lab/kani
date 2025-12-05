import { Injectable, Logger } from "@nestjs/common"
import { Transaction } from "@mysten/sui/transactions"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"
import { CoinArgument, CoinAsset } from "../types"
import { isSuiCoin, ZERO_BN } from "@modules/common"
import { toCoinArguments } from "../convert"

export interface SplitCoinResponse {
    spendCoin: CoinArgument
}

export interface FetchAndMergeCoinsParams {
    suiClient: SuiClient
    txb?: Transaction
    owner: string
    coinType: string
    suiGasAmount?: BN
    // if not specified, will use the balance of the account
    requiredAmount?: BN
}

export interface SplitCoinParams {
    txb?: Transaction
    sourceCoin: CoinArgument
    requiredAmount: BN
}

export interface FetchAndMergeCoinsResponse {
    sourceCoin: CoinArgument
    balance: BN
}

export interface SelectCoinAssetGreaterThanOrEqualParams {
    coins: Array<CoinAsset>
    amount: BN
    exclude: Array<string>
}

export interface SelectCoinAssetGreaterThanOrEqualResponse {
    selectedCoins: Array<CoinAsset>
    remainingCoins: Array<CoinAsset>
}

@Injectable()
export class SuiCoinManagerService {
    private readonly logger = new Logger(SuiCoinManagerService.name)

    constructor() {}

    /**
     * Split a coin object into:
     * 1. spendCoin with the required amount
     * 2. the remaining balance in the source coin
     */
    

    
    /**
     * Greedy selection of coins to cover at least `amount`.
     * Returns selected coins and the remaining coins.
     */
    
}