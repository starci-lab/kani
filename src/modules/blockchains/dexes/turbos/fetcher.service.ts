import { Injectable } from "@nestjs/common"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import { ChainId, Network } from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"
import {
    FetchedPool,
    FetchPoolsParams,
    FetchPoolsResponse,
    IFetchService,
} from "../../interfaces"
import { DexId, DexSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { BN } from "bn.js"

@Injectable()
export class TurbosFetcherService implements IFetchService {
    constructor(
        @InjectTurbosClmmSdks()
        private readonly turbosClmmSdks: Record<Network, TurbosSdk>,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    async fetchPools({
        network = Network.Mainnet,
    }: FetchPoolsParams): Promise<FetchPoolsResponse> {
        // skip testnet
        if (network === Network.Testnet) {
            throw new Error("Testnet is not supported")
        }
        const turbosSdk = this.turbosClmmSdks[network]  
        // liquidity in sui network only
        const liquidityPools = this.primaryMemoryStorageService.liquidityPools
            // safe filter to avoid undefined dex
            .filter(liquidityPool => !!liquidityPool.dex)
            .filter(
                (liquidityPool) =>
                    (liquidityPool.dex as DexSchema).displayId === DexId.Turbos &&
                liquidityPool.network === network &&
                liquidityPool.chainId === ChainId.Sui,
            )
        const pools: Array<FetchedPool> = []
        for (const liquidityPool of liquidityPools) {
            const fetchedPool = await turbosSdk.pool.getPool(
                liquidityPool.poolAddress,
            )
            pools.push({
                displayId: liquidityPool.displayId,
                poolAddress: fetchedPool.id.id,
                currentTick: turbosSdk.math.sqrtPriceX64ToTickIndex(
                    new BN(fetchedPool.sqrt_price),
                ),
                currentSqrtPrice: new BN(fetchedPool.sqrt_price),
                tickSpacing: Number(fetchedPool.tick_spacing),
                fee: Number(fetchedPool.fee),
                liquidity: new BN(fetchedPool.liquidity),
                liquidityPool,
                token0: this.primaryMemoryStorageService.tokens.find(
                    (token) =>
                        token.tokenAddress === fetchedPool.coin_a &&
                        token.network === network &&
                        token.chainId === ChainId.Sui,
                )!,
                token1: this.primaryMemoryStorageService.tokens.find(
                    (token) =>
                        token.tokenAddress === fetchedPool.coin_b &&
                        token.network === network &&
                        token.chainId === ChainId.Sui

                )!,
                rewardTokens: fetchedPool.reward_infos
                    .map((rewarderInfo) => rewarderInfo.fields.vault_coin_type)
                    .map(
                        (rewardTokenAddress) =>
                            this.primaryMemoryStorageService.tokens.find(
                                (token) =>
                                    token.tokenAddress === rewardTokenAddress &&
                                    token.network === network,
                            )!,
                    ),
            })
        }
        return { pools }
    }
}
