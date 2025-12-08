import { CoinAsset } from "../../types"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import { Transaction, TransactionResult } from "@mysten/sui/transactions"
import { CoinAssetNotFoundException } from "@exceptions"
import { LoadBalancerName } from "@modules/databases"
import { ClientType, RpcPickerService } from "../../clients"

@Injectable()
export class FetchCoinsService {
    constructor(
        private readonly rpcPickerService: RpcPickerService,
    ) {}

    async fetchCoins({
        owner,
        coinType,
        loadBalancerName,
    }: FetchCoinsParams): Promise<FetchCoinsResponse> {
        let cursor: string | null | undefined = undefined
        const coinAssets: Array<CoinAsset> = []
        do {
            const result = await this.rpcPickerService.withSuiClient({
                clientType: ClientType.Read,
                mainLoadBalancerName: loadBalancerName,
                callback: async (client) => {
                    return await client.getCoins({ 
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
                })))
            cursor = result.nextCursor
        } while (cursor !== undefined)
        const totalBalance = coinAssets.reduce((acc, coin) => acc.add(coin.coinAmount), new BN(0))
        return {
            coinAssets,
            totalBalance: new BN(totalBalance),
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
    loadBalancerName: LoadBalancerName
}

export interface FetchCoinsResponse {
    coinAssets: Array<CoinAsset>
    totalBalance: BN
    
}

export interface ResolveCoinAssetParams {
    coinAssets: Array<CoinAsset>
    txb: Transaction
}

export interface ResolveCoinAssetResponse {
    coinAsset: CoinAsset
    txResult?: TransactionResult
}