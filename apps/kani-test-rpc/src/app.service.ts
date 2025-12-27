import { Injectable, OnModuleInit } from "@nestjs/common"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { address, fetchEncodedAccount } from "@solana/kit"
import { Position } from "@modules/blockchains/dexes/orca/beets"

@Injectable()
export class AppService implements OnModuleInit{
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    async onModuleInit() {
        await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc }) => {
                console.log("Fetching transaction...")
                const accountInfo = await fetchEncodedAccount(
                    rpc, 
                    address("ASUq6wEj6rjLRzCr5HWj743FeWaZJDhTU1K9yngsGjCZ"), {
                        commitment: "confirmed",
                    })
                if (!accountInfo || !accountInfo.exists) throw new Error("No account info found")
                const [state] = Position.struct.deserialize(Buffer.from(accountInfo.data), 8)
                console.log(state.whirlpool.toBase58())
                console.log(state.positionMint.toBase58())
                console.log(state.liquidity.toString())
                console.log(state.tickLowerIndex)
                console.log(state.tickUpperIndex)
                console.log(state.feeGrowthCheckpointA.toString())
                console.log(state.feeOwedA.toString())
                console.log(state.feeGrowthCheckpointB.toString())
                console.log(state.feeOwedB.toString())
            },
        })  
    }
}