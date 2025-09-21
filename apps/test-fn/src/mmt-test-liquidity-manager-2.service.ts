import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    LiquidityPoolService,
    PythService,
    MomentumActionService,
    InjectSuiClients,
} from "@modules/blockchains"
import { Network } from "@modules/common"
// import {
//     DexId,
//     liquidityPoolData,
//     LiquidityPoolId,
//     tokenData,
//     TokenId,
// } from "@modules/databases"
import { PoolFetcherService, UserLoaderService } from "@features/fetchers"
import { RetryService } from "@modules/mixin"
import { SuiFlexibleSwapService } from "@modules/blockchains"
import { SuiClient } from "@mysten/sui/client"

@Injectable()
export class Mmt2TestLiquidityManangementService implements OnApplicationBootstrap
{
    constructor(
    private readonly momentumActionService: MomentumActionService,
    private readonly liquidityPoolService: LiquidityPoolService,
    private readonly userLoaderService: UserLoaderService,
    private readonly pythService: PythService,
    private readonly poolFetcherService: PoolFetcherService,
    private readonly retryService: RetryService,
    private readonly suiFlexibleSwapService: SuiFlexibleSwapService,
    @InjectSuiClients()
    private readonly suiClients: Record<Network, Array<SuiClient>>,
    ) {}

    async onApplicationBootstrap() {
        // const liquidityPools = liquidityPoolData
        // const tokens = tokenData
        // this.pythService.initialize(tokens)
        // await this.pythService.preloadPrices()
        // const momentumSuiUsdc0175 = liquidityPools.find(
        //     (liquidityPool) =>
        //         liquidityPool.displayId === LiquidityPoolId.MomentumSuiUsdc0175,
        // )
        // if (!momentumSuiUsdc0175) {
        //     throw new Error("Momentum Sui Usdc Liquidity Pool not found")
        // }
        // const [{ fetcher }] = await this.liquidityPoolService.getDexs({
        //     chainId: ChainId.Sui,
        //     dexIds: [DexId.Momentum],
        // })
        // const {
        //     pools: [fetchedPool],
        // } = await fetcher.fetchPools({
        //     liquidityPools: [momentumSuiUsdc0175],
        //     tokens,
        //     network: Network.Mainnet,
        // })
        // const users = await this.userLoaderService.loadUsers()
        // const { suiTokenOuts } = 
        // await this.retryService.retry({
        //     action: () => this.momentumActionService.closePosition({
        //         accountAddress:
        //     "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
        //         priorityAOverB: false,
        //         pool: fetchedPool,
        //         position: {
        //             positionId: "0x08c5983fceccbaa6c208f51fb04e181ab0bb908d0b07da42e4d6b5c4c442fed5",
        //             liquidity: "41214964718",
        //             tickLower: 0,
        //             tickUpper: 0,
        //         },
        //         tokenAId: TokenId.SuiNative,
        //         tokenBId: TokenId.SuiUsdc,
        //         tokens,
        //         user: users[0],
        //     }),
        //     maxRetries: 10   
        // })
        // const { txHash, receivedAmountOut, roiAmount} = await this.retryService.retry({
        //     action: async () =>
        //         await this.suiFlexibleSwapService.suiFlexibleSwap({
        //             network: Network.Mainnet,
        //             tokenOut: TokenId.SuiNative,
        //             tokens,
        //             accountAddress: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
        //             depositAmount: new BN(0),
        //             suiTokenIns: {
        //                 [TokenId.SuiUsdc]: new BN(10000),
        //             },
        //             user: users[0],
        //         })
        // })
        // console.log(`txhash: ${txHash}, receivedAmountOut: ${receivedAmountOut.toString()}, roiAmount: ${roiAmount.toString()}`)
    }
}
