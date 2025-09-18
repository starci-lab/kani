import { Injectable } from "@nestjs/common"
import { ChainId, Network } from "@modules/common"
import {
    FetchedPool,
    FetchPoolsParams,
    FetchPoolsResponse,
    IFetchService,
} from "../../interfaces"
import { DexId } from "@modules/databases"
import { BN } from "bn.js"
import { InjectFlowXClmmSdks } from "./flowx.decorators"
import { FlowXClmmSdk } from "./flowx.providers"

@Injectable()
export class FlowXFetcherService implements IFetchService {
    constructor(
        @InjectFlowXClmmSdks()
        private readonly flowxClmmSdks: Record<Network, FlowXClmmSdk>,
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
                liquidityPool.dexId === DexId.Cetus
                && liquidityPool.network === network
                && liquidityPool.chainId === ChainId.Sui
        )
        const flowxClmmSdk = this.flowxClmmSdks[network]
        const pools: Array<FetchedPool> = []
        const fetchedPools = await flowxClmmSdk.poolManager.getPools()
        const displayId = (poolAddress: string) => {
            return liquidityPools.find(
                (liquidityPool) => liquidityPool.poolAddress === poolAddress,
            )!.displayId
        }
        pools.push(
            ...fetchedPools.map((pool) => ({
                poolAddress: pool.id,
                displayId: displayId(pool.id),
                currentTick: Number(pool.tickCurrent),
                currentSqrtPrice: new BN(pool.sqrtPriceX64),
                tickSpacing: Number(pool.tickSpacing),
                fee: Number(pool.fee),
                token0: tokens.find(
                    (token) =>
                        token.tokenAddress === pool.coinX.coinType && token.network === network && token.chainId === ChainId.Sui,
                )!,
                token1: tokens.find(
                    (token) =>
                        token.tokenAddress === pool.coinY.coinType && token.network === network && token.chainId === ChainId.Sui,
                )!,
                liquidity: new BN(pool.liquidity),
                liquidityPool: liquidityPools.find(
                    (liquidityPool) => liquidityPool.poolAddress === pool.id,
                )!,
                rewardTokens: (pool.poolRewards ?? [])
                    .map((rewarderInfo) => rewarderInfo.coin.coinType)
                    .map(
                        (rewardTokenAddress) =>
                            tokens.find(
                                (token) =>
                                    token.tokenAddress === rewardTokenAddress &&
                                    token.network === network,
                            )!,
                    ),
            })),
        )

        return { pools }
    }
}
