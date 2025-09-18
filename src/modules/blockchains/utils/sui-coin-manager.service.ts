import { Injectable } from "@nestjs/common"
import { Transaction } from "@mysten/sui/transactions"
import { CoinStruct, SuiClient } from "@mysten/sui/client"
import BN from "bn.js"
import { isSuiCoin } from "@modules/common" 
import { CoinAsset } from "../types"

/**
 * Response from splitting a coin into spend + change.
 */
export interface SplitCoinResponse {
    spendCoin: CoinAsset
    sourceCoin: CoinAsset
}

/**
 * Parameters for fetching and merging all coins of a given type.
 */
export interface FetchAndMergeCoinsParams {
    suiClient: SuiClient
    txb?: Transaction
    owner: string
    coinType: string
    suiGasAmount?: BN,
    suiGasInUsed?: BN,
}

export interface SplitCoinParams {
    txb?: Transaction
    sourceCoin: CoinAsset
    requiredAmount: BN
}

/**
 * Response from fetchAndMergeCoins operation.
 */
export interface FetchAndMergeCoinsResponse {
    sourceCoin: CoinAsset // Final merged coin object
}

export interface SelectCoinAssetGreaterThanOrEqualParams {
    coins: Array<CoinAsset>
    amount: BN
    exclude: Array<CoinAsset>
}


export interface SelectCoinAssetGreaterThanOrEqualResponse {
    selectedCoins: Array<CoinAsset>
    remainingCoins: Array<CoinAsset>
    excessCoin?: CoinAsset   // The last coin that caused overshoot (needs split)
    excessAmount?: BN         // The extra amount to split off from excessCoin
}

@Injectable()
export class SuiCoinManagerService {
    constructor() {}

    public splitCoin(
        {
            requiredAmount,
            sourceCoin,
            txb
        }: SplitCoinParams
    ): SplitCoinResponse {
        if (!sourceCoin) {
            throw new Error("sourceCoin is required to perform splitCoin")
        }
        txb = txb || new Transaction()
        if (sourceCoin.coinAmount.lt(requiredAmount)) {
            throw new Error("sourceCoin amount is less than requiredAmount")
        }
        // Split out exactly the required amount into a new coin
        const [spendCoin] = txb.splitCoins(
            sourceCoin.coinObj, [
                txb.pure.u64(requiredAmount.toString()),
            ])
        // Return both spendCoin and the remaining sourceCoin
        return {
            spendCoin: {
                coinAmount: requiredAmount,
                coinObj: spendCoin,
            },
            sourceCoin: {
                coinAmount: sourceCoin.coinAmount.sub(requiredAmount),
                coinObj: sourceCoin.coinObj,
            },
        }
    }

    public async fetchAndMergeCoins({
        suiClient,
        txb,
        owner,
        coinType,
        suiGasAmount,
        suiGasInUsed,
    }: FetchAndMergeCoinsParams): Promise<FetchAndMergeCoinsResponse> {
        txb = txb || new Transaction()
      
        // fetch all coin objects of this type
        const fetchedCoins = await suiClient.getCoins({ owner, coinType })
        if (!fetchedCoins.data.length) throw new Error("No coin found")
      
        // Wrap all coins into UsedCoin
        let usedCoins: Array<CoinAsset> = fetchedCoins.data.map((coin) => ({
            coinAmount: new BN(coin.balance),
            coinObj: txb.object(coin.coinObjectId),
        }))
      
        // special handling for SUI coin → reserve gas
        if (isSuiCoin(coinType)) {
            if (!suiGasAmount) throw new Error("suiGasAmount is required")
            if (!suiGasInUsed) throw new Error("suiGasInUsed is required")
        
            const { selectedCoins, remainingCoins, excessAmount, excessCoin } =
                this.selectCoinAssetGreaterThanOrEqual({
                    coins: fetchedCoins.data.map((coin) => ({
                        coinAmount: new BN(coin.balance),
                        coinObj: txb.object(coin.coinObjectId),
                    })),
                    amount: suiGasAmount,
                    exclude: [],
                })
            // set gas payment
            txb.setGasPayment(
                selectedCoins.map((coin) => ({
                    objectId: coin.coinObj.coinObjectId,
                    version: coin.version,
                    digest: coin.digest,
                }))
            )
            // convert remainingCoins → usedCoins
            usedCoins = remainingCoins.map((coin) => ({
                balance: new BN(coin.balance),
                coin: txb.object(coin.coinObjectId),
            }))
            // calculate remaining total balance
            let remainTotal = usedCoins.reduce(
                (acc, uc) => acc.add(uc.balance),
                new BN(0)
            )
            if (remainTotal.lt(suiGasInUsed)) {
                if (excessAmount && excessCoin) {
                    const { spendCoin } = this.splitCoin({
                        requiredAmount: excessAmount,
                        sourceCoin: txb.object(excessCoin.coinObjectId),
                        txb,
                    })
                    usedCoins.push({
                        balance: excessAmount,
                        coin: spendCoin,
                    })
                    remainTotal = remainTotal.add(excessAmount)
                    if (remainTotal.lt(suiGasInUsed)) {
                        throw new Error("Not enough SUI balance after splitting")
                    }
                } else {
                    throw new Error("Not enough SUI balance for input usage")
                }
            }
        }
      
        // if only 1 coin left, return it
        if (usedCoins.length === 1) {
            return {
                sourceCoin: usedCoins[0].coin,
                totalBalance: usedCoins[0].balance,
            }
        }
      
        // otherwise merge all coins into the first one
        const base = usedCoins[0]
        let total = new BN(0)
      
        // sum balances
        for (const uc of usedCoins) {
            total = total.add(uc.balance)
        }
      
        // merge others into base
        for (let i = 1; i < usedCoins.length; i++) {
            txb.mergeCoins(base.coin, [usedCoins[i].coin])
        }
        
        return {
            sourceCoin: base.coin,
            totalBalance: total,
        }
    }

    public selectCoinAssetGreaterThanOrEqual(
        {
            coins,
            amount,
            exclude
        }: SelectCoinAssetGreaterThanOrEqualParams
    ): SelectCoinAssetGreaterThanOrEqualResponse {
        if (!coins) {
            throw new Error("coins is required to perform selectCoinAssetGreaterThanOrEqual")
        }
        if (!amount) {
            throw new Error("amount is required to perform selectCoinAssetGreaterThanOrEqual")
        }
    
        // filter out excluded coins
        const filtered = coins.filter(coin => !exclude.includes(coin.coinObjectId))
    
        // sort coins by balance in descending order
        const sorted = filtered.sort((a, b) =>
            new BN(b.balance).cmp(new BN(a.balance))
        )
    
        // calculate total balance across all coins
        const total = sorted.reduce((acc, coin) => acc.add(new BN(coin.balance)), new BN(0))
    
        // case: not enough total balance
        if (total.lt(amount)) {
            return { selectedCoins: [], remainingCoins: sorted }
        }
    
        // Case: total balance equals required amount
        if (total.eq(amount)) {
            return { selectedCoins: sorted, remainingCoins: [] }
        }
    
        let sum = new BN(0)
        const selectedCoins: Array<CoinStruct> = []
        const remainingCoins = [...sorted]
    
        // Greedy selection loop until sum >= amount
        while (sum.lt(amount)) {
            const target = amount.sub(sum)
    
            // Try to find a coin that covers the remaining target in one go
            const idx = remainingCoins.findIndex(c => new BN(c.balance).gte(target))
            if (idx !== -1) {
                const coin = remainingCoins[idx]
                selectedCoins.push(coin)
                sum = sum.add(new BN(coin.balance))
                remainingCoins.splice(idx, 1)
                break
            }
    
            // Otherwise, take the largest available coin
            const coinWithLargestBalance = remainingCoins.shift()! // sorted desc
            if (new BN(coinWithLargestBalance.balance).gt(new BN(0))) {
                selectedCoins.push(coinWithLargestBalance)
                sum = sum.add(new BN(coinWithLargestBalance.balance))
            }
        }
    
        // If sum > amount, mark the last coin as excess for splitting
        let excessCoin: CoinStruct | undefined
        let excessAmount: BN | undefined
        if (sum.gt(amount)) {
            excessCoin = selectedCoins[selectedCoins.length - 1]
            excessAmount = sum.sub(amount)
        }
    
        return {
            selectedCoins: selectedCoins.sort((a, b) => new BN(b.balance).cmp(new BN(a.balance))),
            remainingCoins: remainingCoins.sort((a, b) => new BN(b.balance).cmp(new BN(a.balance))),
            excessCoin,
            excessAmount,
        }
    }
}

