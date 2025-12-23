import { RpcAccessType } from "@modules/filesystem"
import { P2CBalancerService, RpcTransport } from "@modules/p2c-balancer"
import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { createSolanaRpc } from "@solana/kit"
import { ChainId } from "@typedefs"

@Injectable()
export class AppService implements OnApplicationBootstrap{
    constructor(
        private readonly p2cBalancerService: P2CBalancerService
    ) {}
    async onApplicationBootstrap() {
        const solanaRpc = this.p2cBalancerService.balance({ 
            chainId: ChainId.Solana, 
            transport: RpcTransport.Http, 
            accessType: RpcAccessType.Write 
        })
        const solanaRpcSubscriptions = this.p2cBalancerService.balance({ 
            chainId: ChainId.Solana,
            transport: RpcTransport.Ws,
            accessType: RpcAccessType.Write 
        })
        console.log(`solanaRpc: ${solanaRpc}, solanaRpcSubscriptions: ${solanaRpcSubscriptions}`)
        // try call solana rpc with two kinds of client types
        const solanaRpcWrite = createSolanaRpc(solanaRpc)
        // test send 1 SOL to the solana rpc
    }
}