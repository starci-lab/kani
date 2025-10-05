import { Injectable } from "@nestjs/common"
import { InjectCetusClmmSdks } from "./cetus.decorators"
import { ChainId, isSameAddress, Network } from "@modules/common"
import { CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import {
    FetchedPool,
    FetchPoolsParams,
    FetchPoolsResponse,
    IFetchService,
} from "../../interfaces"
import { DexId, DexSchema, MemDbQueryService, MemDbService } from "@modules/databases"
import { BN } from "bn.js"

@Injectable()
export class CetusFetcherService implements IFetchService {
    constructor(
        @InjectCetusClmmSdks()
        private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
        private readonly memDbService: MemDbService,
        private readonly memDbQueryService: MemDbQueryService,
    ) { }

    async fetchPools({
        network = Network.Mainnet,
    }: FetchPoolsParams,
    ): Promise<FetchPoolsResponse> {
        // skip testnet
        if (network === Network.Testnet) {
            throw new Error("Testnet is not supported")
        }
        // liquidity in sui network only
        const populatedLiquidityPools = 
        this.memDbQueryService.populateLiquidityPools()
            // safe filter to avoid undefined dex
            .filter(liquidityPool => !!liquidityPool.dex)
            .filter(
                (liquidityPool) => 
                    (liquidityPool.dex as DexSchema).displayId === DexId.Cetus
                && liquidityPool.network === network
                && liquidityPool.chainId === ChainId.Sui
            )
        const cetusClmmSdk = this.cetusClmmSdks[network]
        const pools: Array<FetchedPool> = []
        const fetchedPools = await cetusClmmSdk.Pool.getPools(
            populatedLiquidityPools.map(
                (liquidityPool) => 
                    liquidityPool.poolAddress
            )
        )
        const displayId = (poolAddress: string) => {
            return populatedLiquidityPools.find(
                (liquidityPool) => liquidityPool.poolAddress === poolAddress,
            )!.displayId
        }
        pools.push(
            ...fetchedPools.map((pool) => ({
                poolAddress: pool.poolAddress,
                displayId: displayId(pool.poolAddress),
                currentTick: Number(pool.current_tick_index),
                currentSqrtPrice: new BN(pool.current_sqrt_price),
                tickSpacing: Number(pool.tickSpacing),
                fee: Number(pool.fee_rate),
                token0: this.memDbService.tokens.find(
                    (token) =>
                        isSameAddress(token.tokenAddress, pool.coinTypeA) && token.network === network && token.chainId === ChainId.Sui,
                )!,
                token1: this.memDbService.tokens.find(
                    (token) =>
                        isSameAddress(token.tokenAddress, pool.coinTypeB) && token.network === network && token.chainId === ChainId.Sui,
                )!,
                liquidity: new BN(pool.liquidity),
                liquidityPool: populatedLiquidityPools.find(
                    (liquidityPool) => liquidityPool.poolAddress === pool.poolAddress,
                )!,
                rewardTokens: (pool.rewarder_infos ?? [])
                    .map((rewarderInfo) => rewarderInfo.coinAddress)
                    .map(
                        (rewardTokenAddress) =>
                            this.memDbService.tokens.find(
                                (token) =>
                                    isSameAddress(token.tokenAddress, rewardTokenAddress) &&
                                    token.network === network,
                            )!,
                    ),
            })),
        )
        return { pools }
    }
}
