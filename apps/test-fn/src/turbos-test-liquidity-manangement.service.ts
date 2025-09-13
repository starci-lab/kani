import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { LiquidityPoolService, PythService, TurbosActionService } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { DexId, liquidityPoolData, LiquidityPoolId, tokenData, TokenId } from "@modules/databases"
import BN from "bn.js"

@Injectable()
export class TurbosTestLiquidityManangementService implements OnApplicationBootstrap {
    constructor(
        private readonly turbosActionService: TurbosActionService,
        private readonly liquidityPoolService: LiquidityPoolService,
        private readonly pythService: PythService,
    ) { }

    async onApplicationBootstrap() {
        const liquidityPools = liquidityPoolData
        const tokens = tokenData
        const ikaUsdcLiquidityPool = liquidityPools.find((liquidityPool) => liquidityPool.displayId === LiquidityPoolId.TurbosIkaUsdcIka015)
        if (!ikaUsdcLiquidityPool) {
            throw new Error("Ika Usdc Liquidity Pool not found")
        }
        const [{ fetcher }] = await this.liquidityPoolService.getDexs({
            chainId: ChainId.Sui,
            dexIds: [DexId.Turbos]
        })
        const { pools: [fetchedPool]} = await fetcher.fetchPools({
            liquidityPools: [ikaUsdcLiquidityPool],
            tokens,
            network: Network.Mainnet
        })
        const oraclePrice = await this.pythService.computeOraclePrice({
            tokenAId: TokenId.SuiIka,
            tokenBId: TokenId.SuiUsdc,
            chainId: ChainId.Sui,
            network: Network.Mainnet,
            tokens,
        })
        console.log(oraclePrice)
        const txb = await this.turbosActionService.openPosition({
            accountAddress: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
            priorityAOverB: false,
            pool: fetchedPool,
            amount: new BN("1000000"), // 1 usdc
            tokenAId: TokenId.SuiIka,
            tokenBId: TokenId.SuiUsdc,
            tokens,
        })
        console.log(txb)
    }
}