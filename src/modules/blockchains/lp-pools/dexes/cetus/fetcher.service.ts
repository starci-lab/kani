import { Injectable } from "@nestjs/common"
import { InjectCetusClmmSdks } from "./cetus.decorators"
import { combinations, Network } from "@modules/common"
import { CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { MemDbService, TokenId } from "@modules/databases"
import {
    FetchedPool,
    FetchPoolsResponse,
    IFetchService,
} from "../../interfaces"

@Injectable()
export class CetusFetcherService implements IFetchService {
    constructor(
    private readonly memDbService: MemDbService,
    @InjectCetusClmmSdks()
    private readonly cetusClmmSdks: Record<Network, CetusClmmSDK>,
    ) {}

    async fetchPools(
        tokenIds: Array<TokenId>,
        network: Network = Network.Mainnet,
    ): Promise<FetchPoolsResponse> {
        const tokens = this.memDbService.tokens.filter((token) =>
            tokenIds.includes(token.displayId),
        )
        // we skip testnet
        if (network === Network.Testnet)
            throw new Error("Testnet is not supported")
        // we proccess mainnet
        if (tokens.length < 2 || tokens.length > 3) {
            throw new Error(`Invalid number of tokens: ${tokens.length}`)
        }

        const pairs = combinations(tokens, 2)
        const cetusClmmSdk = this.cetusClmmSdks[network]
        const pools: Array<FetchedPool> = []
        for (const pair of pairs) {
            const fetchedPools = await cetusClmmSdk.Pool.getPoolByCoins(
                pair.map((token) => token.tokenAddress),
            )
            const token0 = tokens.find(
                (token) => token.tokenAddress === pair.at(0)?.tokenAddress,
            )
            const token1 = tokens.find(
                (token) => token.tokenAddress === pair.at(0)?.tokenAddress,
            )
            if (!token0 || !token1) {
                throw new Error(
                    `Token not found: ${pair.at(0)?.tokenAddress} or ${pair.at(1)?.tokenAddress}`,
                )
            }
            pools.push(
                ...fetchedPools.map((pool) => ({
                    id: pool.poolAddress,
                    currentTick: Number(pool.current_tick_index),
                    currentSqrtPrice: Number(pool.current_sqrt_price),
                    tickSpacing: Number(pool.tickSpacing),
                    token0,
                    token1,
                    rewardTokens: pool.rewarder_infos
                        .map((rewarderInfo) => rewarderInfo.coinAddress)
                        .map(
                            (rewardTokenAddress) =>
                tokens.find(
                    (token) => token.tokenAddress === rewardTokenAddress,
                )!,
                        ),
                })),
            )
        }
        return {
            pools,
        }
    }
}
