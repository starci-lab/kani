import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    LiquidityPoolService,
    PythService,
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
import { UserLoaderService } from "@features/fetchers"
import { CetusActionService } from "@modules/blockchains/dexes/cetus/action.service"

@Injectable()
export class CetusTestLiquidityManangementService
implements OnApplicationBootstrap
{
    constructor(
    private readonly cetusActionService: CetusActionService,
    private readonly liquidityPoolService: LiquidityPoolService,
    private readonly userLoaderService: UserLoaderService,
    private readonly pythService: PythService,
    ) {}

    async onApplicationBootstrap() {
        const liquidityPools = liquidityPoolData
        const tokens = tokenData
        this.pythService.initialize(tokens)
        await this.pythService.preloadPrices()
        const cetusUsdcEth025Pool = liquidityPools.find(
            (liquidityPool) =>
                liquidityPool.displayId === LiquidityPoolId.CetusSuiUsdc005,
        )
        if (!cetusUsdcEth025Pool) {
            throw new Error("Sui usdc pool liquidity pool not found")
        }
        const [{ fetcher }] = await this.liquidityPoolService.getDexs({
            chainId: ChainId.Sui,
            dexIds: [DexId.Cetus],
        })
        const {
            pools: [fetchedPool],
        } = await fetcher.fetchPools({
            liquidityPools: [cetusUsdcEth025Pool],
            tokens,
            network: Network.Mainnet,
        })
        const users = await this.userLoaderService.loadUsers()
        const { txHash, positionId } = await this.cetusActionService.openPosition({
            accountAddress:
            "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
            pool: fetchedPool,
            amount: new BN("1000000"), // 1 u
            tokenAId: TokenId.SuiUsdc,
            tokenBId: TokenId.SuiNative,
            tokens,
            priorityAOverB: false,
            user: users[0],
            requireZapEligible: false
        })
        console.log(txHash, positionId)
    }
}
