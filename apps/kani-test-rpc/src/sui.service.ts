import { RpcAccessType } from "@modules/filesystem"
import { Injectable } from "@nestjs/common"
import { RpcExecutorService } from "@modules/blockchains"
import { CronExpression } from "@nestjs/schedule"
import { Cron } from "@nestjs/schedule"
import { Transaction } from "@mysten/sui/transactions"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"

@Injectable()
export class SuiService{
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    @Cron(CronExpression.EVERY_5_SECONDS)
    async test() {
        try {
            await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async (client) => {
                    const signer = new Ed25519Keypair()
                    const txb = new Transaction()
                    const oneSui = 1_000_000_000
                    const suiCoin = txb.splitCoins(txb.gas, [oneSui])
                    txb.transferObjects([suiCoin], signer.getPublicKey().toSuiAddress())
                    const { digest } = await client.signAndExecuteTransaction({
                        transaction: txb,
                        signer: signer,
                    })
                    await client.waitForTransaction({
                        digest: digest,
                    })
                    console.log(digest)
                },
            })
        } catch (error) {
            console.log(error.message)
        }
    }
}