import { Injectable } from "@nestjs/common"
import { InjectCetusClmmSdks } from "./cetus.decorators"
import { Network } from "@modules/common"
import { CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { DexId, MemDbQueryService, MemDbService } from "@modules/databases"
import {
    FetchedPool,
    FetchPoolsParams,
    FetchPoolsResponse,
    IFetchService,
} from "../../interfaces"

@Injectable()
export class CetusFetcherService implements IFetchService {
    constructor(
        private readonly memDbService: MemDbService,
        private readonly memDbQueryService: MemDbQueryService,
        @InjectCetusClmmSdks()
        private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
    ) { }

    async fetchPools({
        poolIds,
        network = Network.Mainnet,
    }: FetchPoolsParams): Promise<FetchPoolsResponse> {
        // skip testnet
        if (network === Network.Testnet) {
            throw new Error("Testnet is not supported")
        }

        const cetusClmmSdk = this.cetusClmmSdks[network]
        const pools: Array<FetchedPool> = []

        poolIds ??= this.memDbQueryService.findPoolsByDexId(DexId.Cetus).map((lpPool) => lpPool.displayId)
        const lpPools = this.memDbQueryService.findPoolsByIds(poolIds)
        const fetchedPools = await cetusClmmSdk.Pool.getPools(
            poolIds.map(
                (lpPoolId) =>
                    lpPools.find(
                        (lpPool) => lpPool.id.toString() === lpPoolId.toString(),
                    )!.poolAddress,
            )!,
        )

        pools.push(
            ...fetchedPools.map((pool) => ({
                id: pool.poolAddress,
                currentTick: Number(pool.current_tick_index),
                currentSqrtPrice: Number(pool.current_sqrt_price),
                tickSpacing: Number(pool.tickSpacing),
                token0: this.memDbService.tokens.find(
                    (token) =>
                        token.tokenAddress === pool.coinTypeA && token.network === network,
                )!,
                token1: this.memDbService.tokens.find(
                    (token) =>
                        token.tokenAddress === pool.coinTypeB && token.network === network,
                )!,
                rewardTokens: pool.rewarder_infos
                    .map((rewarderInfo) => rewarderInfo.coinAddress)
                    .map(
                        (rewardTokenAddress) =>
                            this.memDbService.tokens.find(
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
