import {
    Injectable
} from "@nestjs/common"
import BN from "bn.js"
import {
    CoinAsset,
    CoinArgument
} from "../../types"
import {
    Transaction
} from "@mysten/sui/transactions"
import {
    FetchCoinsService
} from "./fetch-coins.service"
import {
    isSuiCoin,
    ZERO_BN
} from "@modules/utils"
import {
    toCoinArgument
} from "../../utils"
import {
    FetchAndMergeCoinsParams,
    FetchAndMergeCoinsResult,
    SelectCoinAssetGreaterThanOrEqualParams,
    SelectCoinAssetGreaterThanOrEqualResult,
    SplitCoinParams,
    SplitCoinResult
} from "../types"

/**
 * Service for selecting, splitting, and merging Sui coins for transactions.
 *
 * @example
 * const { selectedCoins, remainingCoins } = selectCoinsService.selectCoinAssetGreaterThanOrEqual({ coins, amount, exclude: [] })
 */
@Injectable()
export class SelectCoinsService {
    constructor(
        private readonly fetchCoinsService: FetchCoinsService,
    ) {}

    /**
     * Splits a source coin into a spend amount and updates source remainder.
     *
     * @param param - Transaction builder, source coin, required amount
     * @returns The spend coin argument
     */
    public splitCoin({
        requiredAmount,
        sourceCoin,
        txb,
    }: SplitCoinParams): SplitCoinResult {
        if (!sourceCoin) {
            throw new Error("sourceCoin is required to perform splitCoin")
        }
        txb = txb || new Transaction()
        if (sourceCoin.coinAmount.lt(requiredAmount)) {
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
     * Selects coins whose total balance is >= amount, with optional exclude list; returns selected and remaining.
     *
     * @param param - Coins, required amount, exclude coin IDs
     * @returns Selected coins and remaining coins (each sorted descending by amount)
     */
    public selectCoinAssetGreaterThanOrEqual({
        coins,
        amount,
        exclude,
    }: SelectCoinAssetGreaterThanOrEqualParams): SelectCoinAssetGreaterThanOrEqualResult {
        if (!coins) throw new Error("coins is required")
        if (!amount) throw new Error("amount is required")

        const filtered = coins.filter(
            (c) => !exclude.includes(c.coinRef!.objectId)
        )
        const sorted = filtered.sort((a, b) =>
            new BN(b.coinAmount).cmp(new BN(a.coinAmount))
        )

        const total = sorted.reduce(
            (acc, c) => acc.add(new BN(c.coinAmount)),
            new BN(0)
        )
        if (total.lt(amount)) {
            return {
                selectedCoins: [],
                remainingCoins: sorted
            }
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
     * Merges multiple coin arguments into one (first is target).
     *
     * @param txb - Transaction builder
     * @param coins - Coin arguments to merge
     * @returns Single coin argument with combined amount
     */
    public mergeCoins(
        txb: Transaction,
        coins: Array<CoinArgument>
    ): CoinArgument {
        if (!coins.length) throw new Error("No coins provided to merge")
        if (coins.length === 1) return coins[0]

        const [target,
            ...rest] = coins
        txb.mergeCoins(
            target.coinArg,
            rest.map((c) => c.coinArg)
        )

        const totalAmount = coins.reduce(
            (acc, c) => acc.add(c.coinAmount),
            new BN(0)
        )
        return {
            coinAmount: totalAmount,
            coinArg: target.coinArg
        }
    }

    /**
     * Fetches coins of a type, merges them, and handles SUI gas reservation when needed.
     *
     * @param param - Optional txb, owner, coin type, SUI gas reserve, required amount
     * @returns Source coin argument and account balance
     */
    public async fetchAndMergeCoins({
        txb,
        owner,
        coinType,
        suiGasAmount,
        requiredAmount,
    }: FetchAndMergeCoinsParams): Promise<FetchAndMergeCoinsResult> {
        txb = txb ?? new Transaction()

        const fetchedCoins = await this.fetchCoinsService.fetchCoins({
            owner,
            coinType
        })
        if (!fetchedCoins.coinAssets.length) throw new Error("No coin found")

        const coinAssets = fetchedCoins.coinAssets.map((coin) => ({
            coinAmount: coin.coinAmount,
            coinRef: {
                objectId: coin.coinRef.objectId,
                version: coin.coinRef.version,
                digest: coin.coinRef.digest,
            },
        }))
        const userBalance = fetchedCoins.totalBalance
        requiredAmount = requiredAmount || userBalance

        if (isSuiCoin(coinType)) {
            suiGasAmount = suiGasAmount || ZERO_BN
            const coinAmount = BN.min(
                userBalance.sub(suiGasAmount),
                requiredAmount || userBalance
            )
            txb.setGasPayment(coinAssets.map((coin) => coin.coinRef))
            const [sourceCoin] = txb.splitCoins(txb.gas,
                [
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

        const coinAmount = requiredAmount
            ? BN.min(userBalance,
                requiredAmount)
            : userBalance

        if (coinAssets.length === 1) {
            const [coin] = coinAssets
            const spendCoin = txb.splitCoins(txb.object(coin.coinRef.objectId),
                [
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

        const mergedCoin = this.mergeCoins(
            txb,
            coinAssets.map((coin) => toCoinArgument(coin,
                txb))
        )
        const { spendCoin } = this.splitCoin({
            sourceCoin: mergedCoin,
            requiredAmount: coinAmount,
            txb,
        })
        return {
            sourceCoin: spendCoin,
            balance: userBalance
        }
    }
}
