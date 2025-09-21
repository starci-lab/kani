import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    InjectSuiClients,
    LiquidityPoolService,
    PythService,
    TurbosActionService,
} from "@modules/blockchains"
import { ChainId, Network } from "@modules/common"
import {
    DexId,
    liquidityPoolData,
    LiquidityPoolId,
    tokenData,
    TokenId,
} from "@modules/databases"
import { UserLoaderService } from "@features/fetchers"
import { RetryService } from "@modules/mixin"
import BN from "bn.js"
import { SuiClient } from "@mysten/sui/client"

@Injectable()
export class TurbosTestLiquidityManangementService implements OnApplicationBootstrap
{
    constructor(
    private readonly turbosActionService: TurbosActionService,
    private readonly liquidityPoolService: LiquidityPoolService,
    private readonly userLoaderService: UserLoaderService,
    private readonly pythService: PythService,
    private readonly retryService: RetryService,
    @InjectSuiClients()
    private readonly suiClients: Record<Network, Array<SuiClient>>,
    ) {}

    async onApplicationBootstrap() {
        const liquidityPools = liquidityPoolData
        const tokens = tokenData
        this.pythService.initialize(tokens)
        await this.pythService.preloadPrices()
        const ikaUsdcLiquidityPool = liquidityPools.find(
            (liquidityPool) =>
                liquidityPool.displayId === LiquidityPoolId.TurbosIkaUsdc015,
        )
        if (!ikaUsdcLiquidityPool) {
            throw new Error("Ika Usdc Liquidity Pool not found")
        }
        const [{ fetcher }] = await this.liquidityPoolService.getDexs({
            chainId: ChainId.Sui,
            dexIds: [DexId.Turbos],
        })
        const {
            pools: [fetchedPool],
        } = await fetcher.fetchPools({
            liquidityPools: [ikaUsdcLiquidityPool],
            tokens,
            network: Network.Mainnet,
        })
        const users = await this.userLoaderService.loadUsers()

        // const { suiTokenOuts } = await this.retryService.retry({
        //     action: async () => {
        //         return await this.turbosActionService.closePosition({
        //             pool: fetchedPool,
        //             position: {
        //                 positionId: "0x91f0b5644fc048102b27484f9b923027ae9e98522b1ac277b0165e50a22939fc",
        //                 liquidity: "547277285241",
        //                 tickLower: toI32(4294865266),
        //                 tickUpper: toI32(4294865296),
        //             },
        //             accountAddress: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
        //             priorityAOverB: false,
        //             tokenAId: TokenId.SuiIka,
        //             tokenBId: TokenId.SuiUsdc,
        //             tokens,
        //             user: users[0],
        //         })
        //     },
        //     maxRetries: 10,
        //     delay: 100,
        // })
        // console.log((Object.entries(suiTokenOuts || {})).map(
        //     ([tokenId, amount]) => `${tokenId}: ${amount.toString()}`
        // ))
        const { txHash, liquidity, positionId, depositAmount } = await this.retryService.retry({
            action: async () => {
                return await this.turbosActionService.openPosition({
                    pool: fetchedPool,
                    accountAddress: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
                    amount: new BN(3_000_000), // 3 u
                    tokenAId: TokenId.SuiIka,
                    tokenBId: TokenId.SuiUsdc,
                    tokens,
                    priorityAOverB: false,
                    user: users[0],
                    requireZapEligible: false
                })
            },
            maxRetries: 10,
        })
        console.log(txHash, liquidity.toString(), positionId, depositAmount.toString())
    }
}
