import {
    Injectable
} from "@nestjs/common"
import BN from "bn.js"
import {
    CoinAsset
} from "../../types"
import {
    CoinAssetNotFoundException
} from "@modules/exceptions"
import {
    RpcExecutorService
} from "@modules/blockchains"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    FetchCoinsParams,
    FetchCoinsResult,
    ResolveCoinAssetParams,
    ResolveCoinAssetResult
} from "../types"

/**
 * Service for fetching Sui coins by owner/type and resolving/merging coin assets for transactions.
 *
 * @example
 * const { coinAssets, totalBalance } = await fetchCoinsService.fetchCoins({ owner, coinType })
 */
@Injectable()
export class FetchCoinsService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    /**
     * Fetches all coins of a given type for an owner (paginated).
     *
     * @param param - Owner address and coin type
     * @returns List of coin assets and total balance
     *
     * @example
     * const result = await service.fetchCoins({ owner, coinType })
     */
    async fetchCoins({
        owner,
        coinType,
    }: FetchCoinsParams): Promise<FetchCoinsResult> {
        let cursor: string | null | undefined = undefined
        const coinAssets: Array<CoinAsset> = []

        do {
            const result = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await suiClient.getCoins({
                        owner,
                        coinType,
                        cursor,
                    })
                },
            })

            coinAssets.push(
                ...result.data.map((coin) => ({
                    coinAmount: new BN(coin.balance),
                    coinRef: {
                        objectId: coin.coinObjectId,
                        version: coin.version,
                        digest: coin.digest,
                    },
                }))
            )
            cursor = result.nextCursor
        } while (cursor)

        const totalBalance = coinAssets.reduce(
            (acc, coin) => acc.add(coin.coinAmount),
            new BN(0)
        )

        return {
            coinAssets,
            totalBalance: new BN(totalBalance),
        }
    }

    /**
     * Resolves multiple coin assets into one (merge) for use in a transaction.
     *
     * @param param - Coin assets and transaction builder
     * @returns Primary coin asset and optional merge transaction result
     *
     * @example
     * const { coinAsset, txResult } = await service.resolveCoinAsset({ coinAssets, txb })
     */
    async resolveCoinAsset({
        coinAssets,
        txb,
    }: ResolveCoinAssetParams): Promise<ResolveCoinAssetResult> {
        if (!coinAssets.length) {
            throw new CoinAssetNotFoundException({
            })
        }

        if (coinAssets.length === 1) {
            return {
                coinAsset: coinAssets[0] 
            }
        }

        const [primaryCoinAsset,
            ...restCoinAssets] = coinAssets
        const mergedCoinAssetTxResult = txb.mergeCoins(
            primaryCoinAsset.coinRef.objectId,
            restCoinAssets.map((coin) => coin.coinRef.objectId)
        )

        return {
            coinAsset: primaryCoinAsset,
            txResult: mergedCoinAssetTxResult,
        }
    }
}
