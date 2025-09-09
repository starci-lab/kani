import { Injectable } from "@nestjs/common"
import { InjectCetusClmmSdks } from "./cetus.decorators"
import { ChainId, Network } from "@modules/common"
import { CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import {
    FetchedPool,
    FetchPoolsParams,
    FetchPoolsResponse,
    IFetchService,
} from "../../interfaces"
import { DexId } from "@modules/databases"

@Injectable()
export class CetusFetcherService implements IFetchService {
    constructor(
        @InjectCetusClmmSdks()
        private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
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
        const cetusClmmSdk = this.cetusClmmSdks[network]
        const pools: Array<FetchedPool> = []
        const fetchedPools = await cetusClmmSdk.Pool.getPools(
            liquidityPools.map(
                (liquidityPool) => liquidityPool.poolAddress,
            )
        )
        pools.push(
            ...fetchedPools.map((pool) => ({
                id: pool.poolAddress,
                currentTick: Number(pool.current_tick_index),
                currentSqrtPrice: Number(pool.current_sqrt_price),
                tickSpacing: Number(pool.tickSpacing),
                fee: Number(pool.fee_rate),
                token0: tokens.find(
                    (token) =>
                        token.tokenAddress === pool.coinTypeA && token.network === network && token.chainId === ChainId.Sui,
                )!,
                token1: tokens.find(
                    (token) =>
                        token.tokenAddress === pool.coinTypeB && token.network === network && token.chainId === ChainId.Sui,
                )!,
                rewardTokens: (pool.rewarder_infos ?? [])
                    .map((rewarderInfo) => rewarderInfo.coinAddress)
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
