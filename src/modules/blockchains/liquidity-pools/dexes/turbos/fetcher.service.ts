import { Injectable } from "@nestjs/common"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import { ChainId, Network, toI32 } from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"
import {
    FetchedPool,
    FetchPoolsParams,
    FetchPoolsResponse,
    IFetchService,
} from "../../interfaces"
import { DexId } from "@modules/databases"

@Injectable()
export class TurbosFetcherService implements IFetchService {
    constructor(
        @InjectTurbosClmmSdks()
        private readonly turbosClmmSdks: Record<Network, TurbosSdk>,
    ) { }

    async fetchPools({
        liquidityPools,
        tokens,
        network = Network.Mainnet,
    }: FetchPoolsParams): Promise<FetchPoolsResponse> {
        // skip testnet
        if (network === Network.Testnet) {
            throw new Error("Testnet is not supported")
        }
        // liquidity in sui network only
        liquidityPools = liquidityPools.filter(
            (liquidityPool) =>
                liquidityPool.dexId === DexId.Turbos &&
                liquidityPool.network === network &&
                liquidityPool.chainId === ChainId.Sui,
        )
        const turbosClmmSdk = this.turbosClmmSdks[network]
        const pools: Array<FetchedPool> = []
        for (const liquidityPool of liquidityPools) {
            const fetchedPool = await turbosClmmSdk.pool.getPool(
                liquidityPool.poolAddress,
            )
            pools.push({
                id: fetchedPool.id.id,
                currentTick: toI32(fetchedPool.tick_current_index.fields.bits),
                currentSqrtPrice: Number(fetchedPool.sqrt_price),
                tickSpacing: Number(fetchedPool.tick_spacing),
                fee: Number(fetchedPool.fee),
                liquidity: Number(fetchedPool.liquidity),
                liquidityPool,
                token0: tokens.find(
                    (token) =>
                        token.tokenAddress === fetchedPool.coin_a &&
                        token.network === network &&
                        token.chainId === ChainId.Sui,
                )!,
                token1: tokens.find(
                    (token) =>
                        token.tokenAddress === fetchedPool.coin_b &&
                        token.network === network &&
                        token.chainId === ChainId.Sui

                )!,
                rewardTokens: fetchedPool.reward_infos
                    .map((rewarderInfo) => rewarderInfo.fields.vault_coin_type)
                    .map(
                        (rewardTokenAddress) =>
                            tokens.find(
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
