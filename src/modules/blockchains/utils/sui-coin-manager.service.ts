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
    public splitCoin({
        requiredAmount,
        sourceCoin,
        txb,
    }: SplitCoinParams): SplitCoinResponse {
        if (!sourceCoin) {
            throw new Error("sourceCoin is required to perform splitCoin")
        }
        txb = txb || new Transaction()
        if (sourceCoin.coinAmount.lt(requiredAmount)) {
            this.logger.debug(
                `sourceCoin amount is less than requiredAmount, 
                sourceCoin: ${sourceCoin.coinAmount.toString()}, 
                requiredAmount: ${requiredAmount.toString()}`
            )
            throw new Error("sourceCoin amount is less than requiredAmount")
        }
        const [spendCoin] = txb.splitCoins(
            sourceCoin.coinArg,
            [txb.pure.u64(requiredAmount.toString())]
        )
        sourceCoin.coinAmount = sourceCoin.coinAmount.sub(requiredAmount)
        return {
            spendCoin: {
                coinAmount: requiredAmount,
                coinArg: spendCoin,
            },
        }
    }

    /**
     * Fetch all coins of a type, merge them into one,
     * and handle SUI specially for gas reservation.
     */
    public async fetchAndMergeCoins({
        suiClient,
        txb,
        owner,
        coinType,
        suiGasAmount,
        requiredAmount,
    }: FetchAndMergeCoinsParams): Promise<FetchAndMergeCoinsResponse> {
        txb = txb ?? new Transaction()
        const fetchedCoins = await suiClient.getCoins({ owner, coinType })
        if (!fetchedCoins.data.length) throw new Error("No coin found")

        const coins = fetchedCoins.data.map((coin) => ({
            coinAmount: new BN(coin.balance),
            coinRef: {
                objectId: coin.coinObjectId,
                version: coin.version,
                digest: coin.digest,
            },
        }))
        const { totalBalance } = await suiClient.getBalance({ owner, coinType })
        const userBalance = new BN(totalBalance)
        requiredAmount = requiredAmount || userBalance
        // Special handling for SUI gas
        if (isSuiCoin(coinType)) {
            suiGasAmount = suiGasAmount || ZERO_BN
            const coinAmount = BN.min(
                userBalance.sub(suiGasAmount),
                requiredAmount || userBalance
            )
            txb.setGasPayment(coins.map((coin) => coin.coinRef))
            const [sourceCoin] = txb.splitCoins(txb.gas, [
                txb.pure.u64(coinAmount.toString()),
            ])
            return {
                sourceCoin: {
                    coinAmount: coinAmount,
                    coinArg: sourceCoin,
                },
                balance: userBalance,
            }
        }
        // If only one coin exists, return it directly
        // Select coins to cover the required amount
        const coinAmount = requiredAmount ? BN.min(userBalance, requiredAmount) : userBalance

        if (coins.length === 1) {
            const [ coin ] = coins
            const spendCoin = txb.splitCoins(txb.object(coin.coinRef.objectId), [
                txb.pure.u64(coinAmount.toString()),
            ])
            return {
                sourceCoin: {
                    coinAmount,
                    coinArg: txb.object(spendCoin),
                },
                balance: userBalance,
            }
        }
        // Merge into a single coin
        const mergedCoin = this.mergeCoins(txb, toCoinArguments(coins, txb))
        // Split out exactly the required amount
        const { spendCoin } = this.splitCoin({
            sourceCoin: mergedCoin,
            requiredAmount: coinAmount,
            txb,
        })
        return { sourceCoin: spendCoin, balance: userBalance }
    }
    /**
     * Greedy selection of coins to cover at least `amount`.
     * Returns selected coins and the remaining coins.
     */
    public selectCoinAssetGreaterThanOrEqual({
        coins,
        amount,
        exclude,
    }: SelectCoinAssetGreaterThanOrEqualParams): SelectCoinAssetGreaterThanOrEqualResponse {
        if (!coins) throw new Error("coins is required")
        if (!amount) throw new Error("amount is required")

        // Exclude specific coin IDs
        const filtered = coins.filter(
            (c) => !exclude.includes(c.coinRef!.objectId)
        )
        // Sort by descending balance
        const sorted = filtered.sort((a, b) =>
            new BN(b.coinAmount).cmp(new BN(a.coinAmount))
        )

        const total = sorted.reduce(
            (acc, c) => acc.add(new BN(c.coinAmount)),
            new BN(0)
        )
        if (total.lt(amount)) {
            return { selectedCoins: [], remainingCoins: sorted }
        }

        let sum = new BN(0)
        const selectedCoins: Array<CoinAsset> = []
        const remainingCoins = [...sorted]

        while (sum.lt(amount) && remainingCoins.length > 0) {
            const coin = remainingCoins.shift()!
            selectedCoins.push(coin)
            sum = sum.add(new BN(coin.coinAmount))
        }

        return {
            selectedCoins: selectedCoins.sort((a, b) =>
                new BN(b.coinAmount).cmp(new BN(a.coinAmount))
            ),
            remainingCoins: remainingCoins.sort((a, b) =>
                new BN(b.coinAmount).cmp(new BN(a.coinAmount))
            ),
        }
    }

    /**
     * Merge multiple CoinArguments into a single CoinArgument.
     * The first coin is the merge target, others are merged into it.
     */
    public mergeCoins(
        txb: Transaction,
        coins: Array<CoinArgument>
    ): CoinArgument {
        if (!coins.length) throw new Error("No coins provided to merge")
        if (coins.length === 1) return coins[0]

        const [target, ...rest] = coins
        txb.mergeCoins(
            target.coinArg,
            rest.map((c) => c.coinArg)
        )

        const totalAmount = coins.reduce(
            (acc, c) => acc.add(c.coinAmount),
            new BN(0)
        )
        return { coinAmount: totalAmount, coinArg: target.coinArg }
    }
}