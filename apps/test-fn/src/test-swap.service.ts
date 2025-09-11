import { Injectable, OnModuleInit } from "@nestjs/common"
import { SignerService, SuiSwapService } from "@modules/blockchains"
import { tokenData, TokenId } from "@modules/databases"
import BN from "bn.js"
import { Transaction } from "@mysten/sui/transactions"
import { InjectSuiClients } from "@modules/blockchains"
import { Network } from "@modules/common"
import { SuiClient } from "@mysten/sui/client"
import { UserLoaderService } from "@features/fetchers"
import { SuiExecutionService } from "@modules/blockchains"

@Injectable()
export class TestSwapService implements OnModuleInit {
    constructor(
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
        private readonly suiSwapService: SuiSwapService,
        private readonly signerService: SignerService,
        private readonly userLoaderService: UserLoaderService,
        private readonly suiExecutionService: SuiExecutionService,
    ) { }

    async onModuleInit() {
        // get the first sui client 
        const suiClient = this.suiClients[Network.Mainnet][0]

        const quote = await this.suiSwapService.quote({
            tokenIn: TokenId.SuiUsdc,
            tokenOut: TokenId.SuiIka,
            amountIn: new BN("10000"), // 0.1u
            tokens: tokenData,
        })
 
        const txb = new Transaction()
        const { txb: txbAfter } = await this.suiSwapService.swap({
            routerId: quote.routerId,
            quoteData: quote.quoteData,
            fromAddress: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
            tokenIn: TokenId.SuiUsdc,
            tokenOut: TokenId.SuiIka,
            amountIn: new BN("10000"),
            tokens: tokenData,
            txb
        })
        if (!txbAfter) {
            throw new Error("Transaction is required")
        }
        const [coin] = txbAfter.splitCoins(txbAfter.gas, [txbAfter.pure.u64(1000)])
        txbAfter.transferObjects(
            [coin],
            "0x99c8f234bc7b483ce7a00176b8294805388c165b5c3d6eae909ab333ff601030"
        )   
        const users = await this.userLoaderService.loadUsers()
        // send tx
        const digest = await this.signerService.withSuiSigner<string>({
            network: Network.Mainnet,
            action: async (signer) => {
                const digest = await this.suiExecutionService.signAndExecuteTransaction({
                    suiClient,
                    transaction: txbAfter,
                    signer,
                })
                return digest
            },
            user: users[0],
        })
        console.log(digest)
    }
}