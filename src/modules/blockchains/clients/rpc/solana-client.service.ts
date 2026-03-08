import {
    Injectable
} from "@nestjs/common"
import {
    AsyncService, RetryService
} from "@modules/mixin"
import {
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    isSolanaError,
    Rpc,
    RpcSubscriptions,
    SolanaRpcApi,
    SolanaRpcSubscriptionsApi
} from "@solana/kit"
import {
    P2CBalancerService
} from "@modules/p2c-balancer"
import {
    ChainId,
    httpsToWss
} from "@modules/common"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    AbortError
} from "p-retry"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    SolanaRpcRetryableException,
    SolanaRpcFatalException,
    SolanaRpcIgnorableException,
    RpcClientFatalException,
} from "@modules/exceptions"
import {
    RpcErrorType
} from "../enums"
import {
    WithSolanaRpcParams 
} from "./types"
import {
    SolanaGetErrorTypesService 
} from "./solana-get-error-types.service"

/**
 * Service responsible for executing Solana RPC calls with retry logic and error handling.
 * Handles RPC client creation, retries, and error classification for Solana blockchain.
 *
 * @example
 * const service = new SolanaClientService(...)
 * const result = await service.withRpc({ accessType: RpcAccessType.Http, callback: async ({ rpc }) => {...} })
 */
@Injectable()
export class SolanaClientService {
    constructor(
        private readonly p2cBalancerService: P2CBalancerService,
        private readonly retryService: RetryService,
        private readonly asyncService: AsyncService,
        private readonly winstonService: WinstonService,
        private readonly solanaGetErrorTypesService: SolanaGetErrorTypesService,
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
     * const result = await service.withRpc({ 
     *   accessType: RpcAccessType.Http, 
     *   callback: async ({ rpc }) => await rpc.getBalance(...).send() 
     * })
     */
    async withRpc<TResult = void>({ callback, accessType, options }: WithSolanaRpcParams<TResult>): Promise<TResult> {
        return await this.retryService.retry({
            options,
            action: async () => {
                // get RPC URL from p2c balancer
                const { url: rpcUrl, id } = this.p2cBalancerService.balance({
                    chainId: ChainId.Solana,
                    // in Solana, we use ws for write operations and http for read operations
                    accessType,
                })
                
                // create RPC and RPC subscriptions based on access type
                let rpc: Rpc<SolanaRpcApi>
                let rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
                
                if (accessType === RpcAccessType.Http) {
                    // create HTTP RPC client
                    rpc = createSolanaRpc(rpcUrl)
                } else if (accessType === RpcAccessType.Ws) {
                    // create WebSocket RPC subscriptions
                    rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl)
                } else {
                    // create both HTTP and WebSocket clients for write operations
                    rpc = createSolanaRpc(rpcUrl)
                    rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(rpcUrl))
                }
                
                try {
                    return await this.retryService.retry({
                        options,
                        action: async () => {
                            // resolve tuple of response and error
                            const [
                                result,
                                error
                            ] = await this.asyncService.resolveTuple(
                                callback({
                                    rpc,
                                    rpcSubscriptions,
                                    rpcUrl
                                })
                            )
                            
                            // return result if available
                            if (result !== null) {
                                return result
                            }
    
                            // handle Solana-specific errors
                            if (isSolanaError(error)) {
                                console.log(error.cause)
                                //console.log(error.cause)
                                const errorType = this.solanaGetErrorTypesService.getErrorType({
                                    error 
                                })
                                switch (errorType) {
                                case RpcErrorType.TransactionSubmitFailed:
                                    throw new AbortError(new RpcClientFatalException({
                                        message: error?.message, originalError: error 
                                    }))
                                case RpcErrorType.Fatal:
                                    throw new AbortError(new SolanaRpcFatalException(error?.message))
                                case RpcErrorType.Retryable:
                                    throw new SolanaRpcRetryableException(error?.message)
                                case RpcErrorType.Ignorable:
                                    throw new AbortError(new SolanaRpcIgnorableException(error?.message))
                                }
                            } 
                            // handle non-Solana errors
                            throw new AbortError(new SolanaRpcIgnorableException(error?.message))
                        },
                    })
                } catch (error) {
                    // eject RPC on fatal errors
                    if (error instanceof SolanaRpcFatalException) {
                        this.winstonService.log(
                            WinstonLog.EjectRpcFatalError,
                            {
                                rpcId: id 
                            }
                        )
                        await this.p2cBalancerService.ejectRpcs([id])
                        throw error
                    }
                    throw error
                }
            }
        })
    }
}
