import { DataLikeService } from "@features/fetchers"
import { Network, waitUntil } from "@modules/common"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { FeeToService, GasSuiSwapUtilsService, InjectSuiClients, SuiExecutionService } from "@modules/blockchains"
import { SignerService } from "@modules/blockchains"
import { UserLoaderService } from "@features/fetchers"
import { SuiClient } from "@mysten/sui/client"
import { TokenId } from "@modules/databases"
import BN from "bn.js"

@Injectable()
export class TestFlowService implements OnApplicationBootstrap {
    constructor(
        private readonly dataLikeService: DataLikeService,
        private readonly gasSuiSwapUtilsService: GasSuiSwapUtilsService,
        private readonly signerService: SignerService,
        private readonly userLoaderService: UserLoaderService,
        private readonly suiExecutionService: SuiExecutionService,
        private readonly feeToService: FeeToService,
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
    ) { }

    async onApplicationBootstrap() {
        await waitUntil(() => this.dataLikeService.loaded)
        const txb = new Transaction()
        const { sourceCoin } = await this.gasSuiSwapUtilsService.gasSuiSwap({
            txb,
            network: Network.Mainnet,
            accountAddress: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
            tokenInId: TokenId.SuiUsdc,
            tokens: this.dataLikeService.tokens,
            amountIn: new BN("3000000"),
        })
        await this.feeToService.attachSuiFee({
            txb,
            tokenId: TokenId.SuiUsdc,
            tokens: this.dataLikeService.tokens,
            network: Network.Mainnet,
            amount: sourceCoin.coinAmount,
            sourceCoin,
        })
        // transfer source coin to fee to address
        txb.transferObjects(
            [sourceCoin.coinArg], 
            "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579"
        )
        const users = await this.userLoaderService.loadUsers()
        const digest = await this.signerService.withSuiSigner<string>({
            network: Network.Mainnet,
            action: async (signer) => {
                const digest = await this.suiExecutionService.signAndExecuteTransaction({
                    suiClient: this.suiClients[Network.Mainnet][0],
                    transaction: txb,
                    signer,
                    stimulateOnly: true
                })
                return digest
            },
            user: users[0],
        })
        // const txb = new Transaction()
        // const suiClient = this.suiClients[Network.Mainnet][0]
        // const coins = await suiClient.getCoins({
        //     owner: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
        //     coinType: "0x2::sui::SUI",
        // })
        // txb.setGasPayment(coins.data.map((coin) => ({
        //     objectId: coin.coinObjectId,
        //     version: coin.version,
        //     digest: coin.digest,
        // })))
        // const transferCoin = txb.splitCoins(txb.gas, [txb.pure.u64(1000)])  
        // txb.transferObjects([transferCoin], "0x99c8f234bc7b483ce7a00176b8294805388c165b5c3d6eae909ab333ff601030")
        // await printTransaction(txb)
        // const users = await this.userLoaderService.loadUsers()
        // const digest = await this.signerService.withSuiSigner<string>({
        //     network: Network.Mainnet,
        //     action: async (signer) => {
        //         const digest = await this.suiExecutionService.signAndExecuteTransaction({
        //             suiClient,
        //             transaction: txb,
        //             signer,
        //         })
        //         return digest
        //     },
        //     user: users[0],
        // })
        // console.log(digest)
    }
}