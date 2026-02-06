import {
    Injectable
} from "@nestjs/common"
import {
    AsyncService, RetryService
} from "@modules/mixin"
import {
    SuiClient
} from "@mysten/sui/client"
import {
    P2CBalancerService
} from "@modules/p2c-balancer"
import {
    ChainId
} from "@modules/common"
import {
    AbortError
} from "p-retry"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    SuiRpcRetryableException,
    SuiRpcFatalException,
    SuiRpcIgnorableException,
} from "@modules/exceptions"
import {
    WithSuiClientParams
} from "./types"
import {
    RpcErrorType
} from "../enums"
import {
    SuiGetErrorTypesService
} from "./get-error-types.service"

/**
 * Service responsible for executing Sui RPC calls with retry logic and error handling.
 * Handles Sui client creation, retries, and error classification for Sui blockchain.
 *
 * @example
 * const service = new SuiClientService(...)
 * const result = await service.withClient({ accessType: RpcAccessType.Http, callback: async ({ suiClient }) => {...} })
 */
@Injectable()
export class SuiClientService {
    constructor(
        private readonly p2cBalancerService: P2CBalancerService,
        private readonly retryService: RetryService,
        private readonly asyncService: AsyncService,
        private readonly winstonService: WinstonService,
        private readonly suiGetErrorTypesService: SuiGetErrorTypesService,
    ) { }

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
     * const result = await service.withClient({ 
     *   accessType: RpcAccessType.Http, 
     *   callback: async ({ suiClient }) => await suiClient.getBalance(...) 
     * })
     */
    async withClient<TResult = void>({ callback, accessType, options }: WithSuiClientParams<TResult>): Promise<TResult> {
        return await this.retryService.retry({
            action: async () => {
                // get RPC URL from p2c balancer
                const { url: rpcUrl, id } = this.p2cBalancerService.balance({
                    chainId: ChainId.Sui,
                    accessType,
                })
                
                // create Sui client
                const suiClient = new SuiClient({
                    url: rpcUrl,
                    network: "mainnet",
                })
                
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
                                    suiClient,
                                    rpcUrl
                                })
                            )
                            
                            // return result if available
                            if (result !== null) {
                                return result
                            }
                            
                            // handle null error case
                            if (error === null) {
                                throw new AbortError(new SuiRpcIgnorableException("Unknown error"))
                            }
                            
                            // classify and handle error
                            const errorType = this.suiGetErrorTypesService.getErrorType({
                                error
                            })
                            switch (errorType) {
                            case RpcErrorType.Fatal:
                                throw new AbortError(new SuiRpcFatalException(error?.message))
                            case RpcErrorType.Retryable:
                                throw new SuiRpcRetryableException(error?.message)
                            case RpcErrorType.Ignorable:
                                throw new AbortError(new SuiRpcIgnorableException(error?.message))
                            }
                        },
                    })
                } catch (error) {
                    // eject RPC on fatal errors
                    if (error instanceof SuiRpcFatalException) {
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
