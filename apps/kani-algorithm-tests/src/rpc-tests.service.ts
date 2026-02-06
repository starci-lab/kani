import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"

@Injectable()
export class RpcTestsService implements OnApplicationBootstrap {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    onApplicationBootstrap() {
        this.tryFetchingSolanaLatestBlockhashWithRateLimit()
    }

    private async tryFetchingSolanaLatestBlockhashWithRateLimit() {
        await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                if (!rpc) {
                    throw new Error("RPC is undefined")
                }
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                console.log(latestBlockhash)
            },
        })
    }
}
