import { Injectable } from "@nestjs/common"
import { ChainId, Network, toI32 } from "@modules/common"
import {
    FetchedPool,
    FetchPoolsParams,
    FetchPoolsResponse,
    IFetchService,
} from "../../interfaces"
import { DexId, DexSchema, PrimaryMemoryStorageService, TokenSchema } from "@modules/databases"
import { BN } from "bn.js"
import { InjectMomentumClmmSdks } from "./momentum.decorators"
import { MmtSDK } from "@mmt-finance/clmm-sdk"
import Decimal from "decimal.js"

@Injectable()
export class MomentumFetcherService implements IFetchService {
    constructor(
        @InjectMomentumClmmSdks()
        private readonly clmmSdks: Record<Network, MmtSDK>,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async fetchPools({
        network = Network.Mainnet,
    }: FetchPoolsParams): Promise<FetchPoolsResponse> {
        // Skip testnet (only support mainnet)
        if (network === Network.Testnet) {
            throw new Error("Testnet is not supported")
        }
        // Filter only Momentum pools on Sui mainnet
        const targetPools = this.primaryMemoryStorageService.liquidityPools
            // safe filter to avoid undefined dex
            .filter(liquidityPool => !!liquidityPool.dex)
            .filter(
                (pool) =>
                    (pool.dex as DexSchema).displayId === DexId.Momentum &&
                pool.network === network &&
                pool.chainId === ChainId.Sui,
            )
        if (targetPools.length === 0) {
            return { pools: [] }
        }
        // Get SDK instance for current network
        const clmmSdk = this.clmmSdks[network]

        // Fetch raw pool data from on-chain
        const fetchedPools = await clmmSdk.Pool.getAllPools()
        // Map raw pool data into standardized FetchedPool type
        const pools: Array<FetchedPool> = fetchedPools
            .filter(
                (pool) => {
                    const feeDecimals = new Decimal(pool.lpFeesPercent).div(100)
                    return targetPools.some(
                        (targetPool) => 
                        {
                            const tokenA = this.primaryMemoryStorageService.tokens.find(
                                (token) => token.tokenAddress === pool.tokenX.coinType
                                && token.network === network
                                && token.chainId === ChainId.Sui,
                            )
                            const tokenB = this.primaryMemoryStorageService.tokens.find(
                                (token) => token.tokenAddress === pool.tokenY.coinType
                                && token.network === network
                                && token.chainId === ChainId.Sui,
                            )
                            return targetPool.fee === feeDecimals.toNumber()
                            && (targetPool.tokenA as TokenSchema).displayId === tokenA?.displayId
                            && (targetPool.tokenB as TokenSchema).displayId === tokenB?.displayId
                        }
                    )
                }
            )
            .map((pool) => {
                const token0 = this.primaryMemoryStorageService.tokens.find(
                    (token) =>
                        token.tokenAddress === pool.tokenX.coinType &&
                    token.network === network &&
                    token.chainId === ChainId.Sui,
                )
                const token1 = this.primaryMemoryStorageService.tokens.find(
                    (token) =>
                        token.tokenAddress === pool.tokenY.coinType &&
                    token.network === network &&
                    token.chainId === ChainId.Sui,
                )
                const displayId = (poolAddress: string) => {
                    return targetPools.find(
                        (lp) => lp.poolAddress === poolAddress,
                    )!.displayId
                }
                return {
                    poolAddress: pool.poolId,
                    displayId: displayId(pool.poolId),
                    currentTick: toI32(Number(pool.currentTickIndex)),
                    currentSqrtPrice: new BN(pool.currentSqrtPrice),
                    tickSpacing: pool.tickSpacing,
                    fee: Number(pool.lpFeesPercent),
                    token0: token0!,
                    token1: token1!,
                    liquidity: new BN(pool.liquidity),
                    liquidityPool: targetPools.find(
                        (lp) => lp.poolAddress === pool.poolId,
                    )!,
                    mmtRewarders: pool.rewarders,
                    rewardTokens: (pool.rewarders ?? [])
                        .map((rewarder) => rewarder.coin_type)
                        .map(
                            (rewardAddr) =>
                            this.primaryMemoryStorageService.tokens.find(
                                (token) =>
                                    token.tokenAddress === rewardAddr &&
                                    token.network === network,
                            )!,
                        )
                        .filter(Boolean), // remove null/undefined rewards
                }
            })
        return { pools }
    }
}