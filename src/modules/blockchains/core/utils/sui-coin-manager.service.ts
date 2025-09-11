import { Injectable } from "@nestjs/common"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"

export interface ConsolidateCoinsParams {
    suiClient: SuiClient
    txb: Transaction
    owner: string
    coinType: string
    requiredAmount: BN
}

@Injectable()
export class SuiCoinManagerService {
    constructor() {}
    /**
     * Consolidate coins step by step until the required amount is reached.
     * If the total balance is still insufficient, all available coins will be merged.
     *
     * @returns TransactionObjectArgument | null if no coins are available
     */
    public async consolidateCoins(
        {
            suiClient,
            txb,
            owner,
            coinType,
            requiredAmount,
        }: ConsolidateCoinsParams
    ): Promise<TransactionObjectArgument | null> {
        const coins = await suiClient.getCoins({ owner, coinType })
        if (!coins.data.length) return null
        // Sort by balance (descending) to minimize merge steps
        const sorted = coins.data.sort((a, b) =>
            new BN(b.balance).gt(new BN(a.balance)) ? 1 : -1
        )
        // Use the largest coin as primary
        const primaryCoin = txb.object(sorted[0].coinObjectId)
        let total = new BN(sorted[0].balance)

        // Merge additional coins until the required amount is met
        for (let i = 1; i < sorted.length && total.lt(requiredAmount); i++) {
            const coin = txb.object(sorted[i].coinObjectId)
            txb.mergeCoins(primaryCoin, [coin])
            total = total.add(new BN(sorted[i].balance))
        }
        return primaryCoin
    }
}