import { Injectable, OnModuleInit } from "@nestjs/common"
import { LiquidityPoolService, TurbosActionService } from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import { DexId, liquidityPoolData, LiquidityPoolId, tokenData, TokenId } from "@modules/databases"
import BN from "bn.js"

@Injectable()
export class TurbosTestLiquidityManangementService implements OnModuleInit {
    constructor(
        private readonly turbosActionService: TurbosActionService,
        private readonly liquidityPoolService: LiquidityPoolService,
    ) { }

    async onModuleInit() {
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