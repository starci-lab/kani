import { Injectable } from "@nestjs/common"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"

export interface ConsolidateCoinsParams {
    suiClient: SuiClient
    txb?: Transaction
    owner: string
    coinType: string
    requiredAmount: BN
}

@Injectable()
export class SuiCoinManagerService {
    constructor() {}

    public async consolidateCoins(
        {
            suiClient,
            txb,
            owner,
            coinType,
            requiredAmount,
        }: ConsolidateCoinsParams
    ): Promise<TransactionObjectArgument | null> {
        txb = txb || new Transaction()
        // Fetch all coins of the given type for the owner
        const coins = await suiClient.getCoins({ owner, coinType })
        if (!coins.data.length) return null // No coins available
    
        // Sort coins by balance in descending order (largest first)
        const sorted = coins.data.sort((a, b) =>
            new BN(b.balance).gt(new BN(a.balance)) ? 1 : -1
        )
    
        // Case 1: Only one coin exists
        if (sorted.length === 1) {
            const balance = new BN(sorted[0].balance)
            if (balance.lt(requiredAmount)) return null // Not enough balance
    
            // Split out exactly the required amount
            const primaryCoin = txb.object(sorted[0].coinObjectId)
            const [usedCoin] = txb.splitCoins(primaryCoin, [
                txb.pure.u64(requiredAmount.toString()),
            ])
            return usedCoin
        }
    
        // Case 2: Multiple coins exist -> merge all into the largest one
        const primaryCoin = txb.object(sorted[0].coinObjectId)
        let total = new BN(sorted[0].balance)
    
        for (let i = 1; i < sorted.length; i++) {
            const coin = txb.object(sorted[i].coinObjectId)
            txb.mergeCoins(primaryCoin, [coin])
            total = total.add(new BN(sorted[i].balance))
        }
    
        // If total is still insufficient after merging, return null
        if (total.lt(requiredAmount)) return null
    
        // Split out exactly the required amount from the merged coin
        const [usedCoin] = txb.splitCoins(primaryCoin, [
            txb.pure.u64(requiredAmount.toString()),
        ])
        return usedCoin
    }
}