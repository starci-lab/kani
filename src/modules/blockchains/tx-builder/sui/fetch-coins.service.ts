import { CoinAsset } from "../../types"
import { SuiClient } from "@mysten/sui/client"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import { Transaction, TransactionResult } from "@mysten/sui/transactions"
import { CoinAssetNotFoundException } from "@exceptions"

@Injectable()
export class FetchCoinsService {
    constructor(
    ) {}

    async fetchCoins({
        owner,
        coinType,
        url,
    }: FetchCoinsParams): Promise<FetchCoinsResponse> {
        const client = new SuiClient({
            url,
            network: "mainnet",
        })
        let cursor: string | null | undefined = undefined
        const coinAssets: Array<CoinAsset> = []
        do {
            const result = await client.getCoins({ 
                owner, 
                coinType, 
                cursor,
            })
            coinAssets.push(
                ...result.data.map((coin) => ({
                    coinAmount: new BN(coin.balance),
                    coinRef: {
                        objectId: coin.coinObjectId,
                        version: coin.version,
                        digest: coin.digest,
                    },
                })))
            cursor = result.nextCursor
        } while (cursor !== undefined)
        return {
            coinAssets,
        }
    }

    async resolveCoinAsset(
        {
            coinAssets,
            txb,
        }: ResolveCoinAssetParams): 
        Promise<ResolveCoinAssetResponse> 
    {
        if (!coinAssets.length) {
            throw new CoinAssetNotFoundException("No coin assets provided")
        }
        if (coinAssets.length === 1) {
            return {
                coinAsset: coinAssets[0],
            }
        }
        const [primaryCoinAsset, ...restCoinAssets] = coinAssets
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

export interface FetchCoinsParams {
    owner: string
    coinType: string
    url: string
}

export interface FetchCoinsResponse {
    coinAssets: Array<CoinAsset>
    
}

export interface ResolveCoinAssetParams {
    coinAssets: Array<CoinAsset>
    txb: Transaction
}

export interface ResolveCoinAssetResponse {
    coinAsset: CoinAsset
    txResult?: TransactionResult
}