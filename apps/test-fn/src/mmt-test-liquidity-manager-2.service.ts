import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    LiquidityPoolService,
    PythService,
    MomentumActionService,
} from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import {
    DexId,
    liquidityPoolData,
    LiquidityPoolId,
    tokenData,
    TokenId,
} from "@modules/databases"
import BN from "bn.js"
import { PoolFetcherService, UserLoaderService } from "@features/fetchers"
import { RetryService } from "@modules/mixin"

@Injectable()
export class Mmt2TestLiquidityManangementService implements OnApplicationBootstrap
{
    constructor(
    private readonly momentumActionService: MomentumActionService,
    private readonly liquidityPoolService: LiquidityPoolService,
    private readonly userLoaderService: UserLoaderService,
    private readonly pythService: PythService,
    private readonly poolFetcherService: PoolFetcherService,
    private readonly retryService: RetryService
    ) {}

    async onApplicationBootstrap() {
        const liquidityPools = liquidityPoolData
        const tokens = tokenData
        this.pythService.initialize(tokens)
        await this.pythService.preloadPrices()
        const momentumSuiUsdc0175 = liquidityPools.find(
            (liquidityPool) =>
                liquidityPool.displayId === LiquidityPoolId.MomentumSuiUsdc0175,
        )
        if (!momentumSuiUsdc0175) {
            throw new Error("Momentum Sui Usdc Liquidity Pool not found")
        }
        const [{ fetcher }] = await this.liquidityPoolService.getDexs({
            chainId: ChainId.Sui,
            dexIds: [DexId.Momentum],
        })
        const {
            pools: [fetchedPool],
        } = await fetcher.fetchPools({
            liquidityPools: [momentumSuiUsdc0175],
            tokens,
            network: Network.Mainnet,
        })
        const users = await this.userLoaderService.loadUsers()
        const { txHash } = await this.retryService.retry({
            action: async () => {
                return await this.momentumActionService.openPosition({
                    accountAddress:
            "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
                    priorityAOverB: false,
                    pool: fetchedPool,
                    amount: new BN("5000000"), // 5 usdc
                    tokenAId: TokenId.SuiNative,
                    tokenBId: TokenId.SuiUsdc,
                    tokens,
                    user: users[0],
                    requireZapEligible: false
                })
            }
        })
        console.log(txHash)
    }
}
