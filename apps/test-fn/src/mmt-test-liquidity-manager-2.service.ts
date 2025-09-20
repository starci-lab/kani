import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import {
    LiquidityPoolService,
    PythService,
    MomentumActionService,
    InjectSuiClients,
} from "@modules/blockchains"
import { Network } from "@modules/common"
import {
    liquidityPoolData,
    LiquidityPoolId,
    tokenData,
    TokenId,
} from "@modules/databases"
import { PoolFetcherService, UserLoaderService } from "@features/fetchers"
import { RetryService } from "@modules/mixin"
import { SuiFlexibleSwapService } from "@modules/blockchains"
import { BN } from "bn.js"
import { SuiClient } from "@mysten/sui/client"
import { CoinAsset } from "@modules/blockchains/types"

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
        const users = await this.userLoaderService.loadUsers()
        // const { fees, withdrawed, rewards, txHash } = 
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
        const client = this.suiClients[Network.Mainnet][0]
        const ikaCoins = await client.getCoins({
            owner: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
            coinType: "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA"
        })
        const usdcCoins = await client.getCoins({
            owner: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
            coinType: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
        })
        const { receivedAmountOut, roiAmount} = await this.retryService.retry({
            action: async () =>
                await this.suiFlexibleSwapService.suiFlexibleSwap({
                    network: Network.Mainnet,
                    tokenOut: TokenId.SuiNative,
                    tokens,
                    accountAddress: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
                    depositAmount: new BN(0),
                    suiTokenIns: {
                        [TokenId.SuiIka]: 
                            ikaCoins.data.slice(0, 5).map<CoinAsset>((coin) => ({
                                coinAmount: new BN(coin.balance),
                                coinRef: {
                                    objectId: coin.coinObjectId,
                                    version: coin.version,
                                    digest: coin.digest,
                                },
                            })),
                        [TokenId.SuiUsdc]: 
                            usdcCoins.data.slice(0, 1).map<CoinAsset>((coin) => ({
                                coinAmount: new BN(coin.balance),
                                coinRef: {
                                    objectId: coin.coinObjectId,
                                    version: coin.version,
                                    digest: coin.digest,
                                },
                            })),
                    },
                    user: users[0],
                })
        })
        console.log(`receivedAmountOut: ${receivedAmountOut.toString()}, roiAmount: ${roiAmount.toString()}`)
    }
}
