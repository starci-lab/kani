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
    providedCoins?: Array<TransactionObjectArgument>
}

export interface ConsolidateCoinsResponse {
    spendCoin: TransactionObjectArgument   // exact amount to be used
    changeCoin?: TransactionObjectArgument // remaining balance (if any)
}

@Injectable()
export class SuiCoinManagerService {
    constructor() {}

    public async consolidateCoins({
        suiClient,
        txb,
        owner,
        coinType,
        requiredAmount,
        providedCoins,
    }: ConsolidateCoinsParams): Promise<ConsolidateCoinsResponse | null> {
        txb = txb || new Transaction()

        let sourceCoin: TransactionObjectArgument
        let total = new BN(0)

        // Case 1: providedCoins passed in explicitly
        if (providedCoins && providedCoins.length > 0) {
            sourceCoin = providedCoins[0]

            // Merge all provided coins into the first one
            for (let i = 1; i < providedCoins.length; i++) {
                txb.mergeCoins(sourceCoin, [providedCoins[i]])
            }
            // NOTE: In this mode we cannot auto-sum balances because TransactionObjectArgument
            // does not contain balances — caller should ensure sufficient amount.
            // We just split blindly and assume requiredAmount is <= total balance.
        } else {
            // Case 2: fetch coins directly from the chain
            const fetchedCoins = await suiClient.getCoins({ owner, coinType })
            if (!fetchedCoins.data.length) return null // No coins available

            // Sort coins by balance in descending order (largest first)
            const sorted = fetchedCoins.data.sort((a, b) =>
                new BN(b.balance).cmp(new BN(a.balance))
            )

            // Use the largest coin as the "source coin"
            sourceCoin = txb.object(sorted[0].coinObjectId)
            total = new BN(sorted[0].balance)

            for (let i = 1; i < sorted.length; i++) {
                const coin = txb.object(sorted[i].coinObjectId)
                txb.mergeCoins(sourceCoin, [coin])
                total = total.add(new BN(sorted[i].balance))
            }

            // If total balance is still less than required, return null
            if (total.lt(requiredAmount)) return null
        }
        // Split sourceCoin into:
        // - spendCoin: exact requiredAmount
        // - changeCoin: remaining balance (if any)
        const [spendCoin, changeCoin] = txb.splitCoins(sourceCoin, [
            txb.pure.u64(requiredAmount.toString()),
        ])
        return {
            spendCoin,
            changeCoin: total.eq(requiredAmount) ? undefined : changeCoin,
        }
    }
}