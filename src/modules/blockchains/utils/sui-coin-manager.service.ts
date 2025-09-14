import { Injectable } from "@nestjs/common"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import { SuiClient } from "@mysten/sui/client"
import BN from "bn.js"

/**
 * Response from splitting a coin into spend + change.
 */
export interface SplitCoinResponse {
    spendCoin: TransactionObjectArgument
    sourceCoin: TransactionObjectArgument
}

/**
 * Parameters for fetching and merging all coins of a given type.
 */
export interface FetchAndMergeCoinsParams {
    suiClient: SuiClient
    txb?: Transaction
    owner: string
    coinType: string
}

export interface SplitCoinParams {
    txb?: Transaction
    sourceCoin: TransactionObjectArgument
    requiredAmount: BN
}

/**
 * Response from fetchAndMergeCoins operation.
 */
export interface FetchAndMergeCoinsResponse {
    sourceCoin: TransactionObjectArgument // Final merged coin object
    totalBalance: BN                 // Total balance after merging
}

@Injectable()
export class SuiCoinManagerService {
    constructor() {}

    public async splitCoin(
        {
            requiredAmount,
            sourceCoin,
            txb
        }: SplitCoinParams
    ): Promise<SplitCoinResponse> {
        if (!sourceCoin) {
            throw new Error("sourceCoin is required to perform splitCoin")
        }
        txb = txb || new Transaction()
        // Split out exactly the required amount into a new coin
        const [spendCoin] = txb.splitCoins(sourceCoin, [
            txb.pure.u64(requiredAmount.toString()),
        ])
        // Return both spendCoin and the remaining sourceCoin
        return {
            spendCoin,
            sourceCoin,
        }
    }

    public async fetchAndMergeCoins({
        suiClient,
        txb,
        owner,
        coinType,
    }: FetchAndMergeCoinsParams): Promise<FetchAndMergeCoinsResponse | null> {
        txb = txb || new Transaction()

        // Fetch all coin objects of this type
        const fetchedCoins = await suiClient.getCoins({ owner, coinType })
        if (!fetchedCoins.data.length) return null

        // Sort coins by balance in descending order
        const sorted = fetchedCoins.data.sort((a, b) =>
            new BN(b.balance).cmp(new BN(a.balance))
        )

        // Pick the largest coin as the base
        const baseCoin = txb.object(sorted[0].coinObjectId)
        let total = new BN(sorted[0].balance)

        // Merge smaller coins into the base coin
        for (let i = 1; i < sorted.length; i++) {
            const coin = txb.object(sorted[i].coinObjectId)
            txb.mergeCoins(baseCoin, [coin])
            total = total.add(new BN(sorted[i].balance))
        }

        return {
            sourceCoin: baseCoin,
            totalBalance: total,
        }
    }
}