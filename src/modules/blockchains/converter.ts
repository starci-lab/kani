import { CoinArgument, CoinAsset } from "./types"
import { Transaction } from "@mysten/sui/transactions"

export const toCoinArgument = (
    coinAsset: CoinAsset,
    txb: Transaction,
): CoinArgument => {
    return {
        coinAmount: coinAsset.coinAmount,
        coinArg: txb.object(coinAsset.coinRef.objectId),
        coinObjectId: coinAsset.coinRef.objectId,
    }
}

export const toCoinArguments = (
    coinAssets: Array<CoinAsset>,
    txb: Transaction,
): Array<CoinArgument> => {
    return coinAssets.map((coinAsset) => toCoinArgument(coinAsset, txb))
}
