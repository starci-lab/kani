import {
    Injectable 
} from "@nestjs/common"
import {
    WithSolanaRpcParams,
    WithSuiClientParams,
} from "./types"
import {
    SolanaClientService
} from "./solana"
import {
    SuiClientService
} from "./sui"


/**
 * Service responsible for executing RPC calls with retry logic and error handling.
 * Delegates to chain-specific client services (Solana, Sui) for actual RPC execution.
 *
 * @example
 * const service = new RpcExecutorService(...)
 * const result = await service.withSolanaRpc({ accessType: RpcAccessType.Http, callback: async ({ rpc }) => {...} })
 */
@Injectable()
export class RpcExecutorService {
    constructor(
        private readonly solanaClientService: SolanaClientService,
        private readonly suiClientService: SuiClientService,
    ) { }

    /**
     * Executes a callback with Solana RPC client, handling retries and error classification.
     *
     * @param param - Parameters for executing Solana RPC callback
     * @param param.callback - Callback function to execute with RPC client
     * @param param.accessType - Type of RPC access (Http, Ws, or Write)
     * @param param.options - Optional retry configuration
     * @returns Result from the callback function
     *
     * @example
     * const result = await service.withSolanaRpc({ 
     *   accessType: RpcAccessType.Http, 
     *   callback: async ({ rpc }) => await rpc.getBalance(...).send() 
     * })
     */
    public async withSolanaRpc<TResult = void>(param: WithSolanaRpcParams<TResult>): Promise<TResult> {
        return await this.solanaClientService.withRpc(param)
    }

    /**
     * Executes a callback with Sui client, handling retries and error classification.
     *
     * @param param - Parameters for executing Sui client callback
     * @param param.callback - Callback function to execute with Sui client
     * @param param.accessType - Type of RPC access (Http or Write)
     * @param param.options - Optional retry configuration
     * @returns Result from the callback function
     *
     * @example
     * const result = await service.withSuiClient({ 
     *   accessType: RpcAccessType.Http, 
     *   callback: async ({ suiClient }) => await suiClient.getBalance(...) 
     * })
     */
    public async withSuiClient<TResult = void>(param: WithSuiClientParams<TResult>): Promise<TResult> {
        return await this.suiClientService.withClient(param)
    }
}
