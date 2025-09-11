import { Injectable, OnModuleInit } from "@nestjs/common"
import { SignerService, SuiSwapService } from "@modules/blockchains"
import { tokenData, TokenId } from "@modules/databases"
import BN from "bn.js"
import { Transaction } from "@mysten/sui/transactions"
import { InjectSuiClients } from "@modules/blockchains"
import { Network } from "@modules/common"
import { SuiClient } from "@mysten/sui/client"
import { UserLoaderService } from "@features/fetchers"

@Injectable()
export class AppService implements OnModuleInit {
    constructor(
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
        private readonly suiSwapService: SuiSwapService,
        private readonly signerService: SignerService,
        private readonly userLoaderService: UserLoaderService,
    ) { }

    async onModuleInit() {
        // get the first sui client 
        const suiClient = this.suiClients[Network.Mainnet][0]
        console.log(suiClient)
        const quote = await this.suiSwapService.quote({
            tokenIn: TokenId.SuiUsdc,
            tokenOut: TokenId.SuiIka,
            amountIn: new BN("100000"), // 0.1u
            tokens: tokenData,
        })
        const txb = new Transaction()
        const { txPayload } = await this.suiSwapService.swap({
            serializedData: quote.serializedData,
            fromAddress: "0xe97cf602373664de9b84ada70a7daff557f7797f33da03586408c21b9f1a6579",
            tokenIn: TokenId.SuiUsdc,
            tokenOut: TokenId.SuiIka,
            amountIn: new BN("100000"),
            tokens: tokenData,
            serializedTx: await txb.toJSON(),
        })
        const users = await this.userLoaderService.loadUsers()
        // send tx
        const digest = await this.signerService.withSuiSigner<string>({
            network: Network.Mainnet,
            action: async (signer) => {
                const { digest } =  await suiClient.signAndExecuteTransaction({
                    transaction: Transaction.from(txPayload),
                    signer,
                })
                return digest
            },
            user: users[0],
        })
        console.log(digest)
    }
}