import { Injectable, Logger } from "@nestjs/common"
import { AsyncService, RetryService } from "@modules/mixin"
import { 
    createSolanaRpc, 
    createSolanaRpcSubscriptions, 
    isSolanaError, 
    Rpc, 
    RpcSubscriptions, 
    SolanaError, 
    SolanaRpcApi, 
    SolanaRpcSubscriptionsApi
} from "@solana/kit"
import { 
    SuiClient, 
    JsonRpcError, 
    SuiHTTPStatusError
} from "@mysten/sui/client"
import { httpsToWss } from "@utils"
import { P2CBalancerService, RpcTransport } from "@modules/p2c-balancer"
import { ChainId } from "@typedefs"
import { RpcAccessType } from "@modules/filesystem"
import { AbortError } from "p-retry"
import { envConfig } from "@modules/env"

// Retryable RPC error indicating a temporary failure that blocks progress
// (e.g. request timeout, transient cluster issues, blockhash expiration,
// or temporary on-chain execution failure).
// Safe to retry with backoff; do not ban/eject the RPC endpoint.
export class SolanaRpcRetryableError extends Error {}
export class SuiRpcRetryableError extends Error {}


export enum RpcErrorType {
    Ignorable = "ignorable",
    Retryable = "retryable",
    Fatal = "fatal",
}

const RETRYABLE_JSON_RPC_CODES = new Set<number>([
    -32603, // InternalError
    -32604, // ServerBusy
    -32050, // TransientError
    -32001, // UnknownError
    -32000, // CallExecutionFailed
])


@Injectable()
export class RpcExecutorService {
    private readonly logger = new Logger(RpcExecutorService.name)
    constructor(
        private readonly p2cBalancerService: P2CBalancerService,
        private readonly retryService: RetryService,
        private readonly asyncService: AsyncService,
    ) {}

    private getSolanaRpcErrorType(error: SolanaError): RpcErrorType {
        const code = error.context?.__code
        const http = error.context?.["statusCode"]
        // =========================
        // RPC TRANSPORT (HTTP LAYER)
        // =========================
        if (code === 8100002 /* SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR */) {
            // Rate limit / gateway / temporary infra issues
            if ([429, 502, 503, 504].includes(http)) {
                return RpcErrorType.Ignorable
            }
      
            // Unauthorized / forbidden => permanent failure
            if ([401, 403].includes(http)) {
                return RpcErrorType.Fatal
            }
      
            // Other HTTP errors -> retry cautiously
            return RpcErrorType.Retryable
        }
      
        // API plan missing for RPC method -> permanent misconfiguration
        if (code === 8100003 /* SOLANA_ERROR__RPC__API_PLAN_MISSING_FOR_RPC_METHOD */) {
            return RpcErrorType.Fatal
        }
      
        // =========================
        // JSON-RPC SERVER ERRORS
        // (-320xx range)
        // =========================
        if (code <= -32000 && code >= -32099) {
            // Node unhealthy, slot not ready, block not available yet, etc.
            return RpcErrorType.Retryable
        }
      
        // =========================
        // CLUSTER / TRANSACTION RUNTIME
        // (7050000–7050015)
        // =========================
        if (code >= 7050000 && code <= 7050015) {
            // blockhash expired, account in use, cluster maintenance, etc.
            return RpcErrorType.Retryable
        }
      
        // =========================
        // RPC SUBSCRIPTIONS
        // (8190000–8190004)
        // =========================
        if (code >= 8190000 && code <= 8190004) {
            // websocket dropped, channel closed, reconnect needed
            return RpcErrorType.Retryable
        }
      
        // =========================
        // INVARIANT VIOLATIONS (SDK BUG)
        // (9900000+)
        // =========================
        if (code >= 9900000) {
            // internal library bug -> treat as fatal for this RPC
            return RpcErrorType.Fatal
        }
      
        // =========================
        // EVERYTHING ELSE
        // =========================
        // Instruction errors, signer errors, codec errors, invalid input, etc.
        // Deterministic failures: retrying will not help.
        return RpcErrorType.Ignorable
    }

    public async withSolanaRpc<TResponse = void>({
        callback,
        accessType,
        requiredWs = false,
    }: WithSolanaRpcParams<TResponse>): Promise<TResponse> {
        return await this.retryService.retry({
            action: async () => {
                // take the url from the p2c balancer
                const { url: rpcUrl, id } = this.p2cBalancerService.balance({
                    chainId: ChainId.Solana,
                    // in solana, we use ws for write operations and http for read operations, because they share the same url
                    transport: accessType === RpcAccessType.Write ? RpcTransport.Ws : (requiredWs ? RpcTransport.Ws : RpcTransport.Http),
                    accessType: accessType,
                })
                // create the rpc and rpc subscriptions
                const rpc = createSolanaRpc(rpcUrl)
                const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(rpcUrl))
                try {
                    return await this.retryService.retry({
                        action: async () => {
                            // resolve the tuple of response and error
                            const [response, error] = await this.asyncService.resolveTuple(
                                callback({ rpc, rpcSubscriptions })
                            )
                            // if the response is not null, return the response
                            if (response !== null) {
                                return response
                            }
                            // if the error is a solana error, throw the error
                            if (isSolanaError(error)) {
                                const errorType = this.getSolanaRpcErrorType(error)
                                if (errorType === RpcErrorType.Fatal) {
                                    throw new AbortError(RpcErrorType.Fatal)
                                }
                                if (errorType === RpcErrorType.Retryable) {
                                    this.logger.error(`Retrying rpc ${id} because of retryable error`)
                                    throw new SolanaRpcRetryableError(error?.message)
                                }
                                if (errorType === RpcErrorType.Ignorable) {
                                    throw new AbortError(RpcErrorType.Ignorable)
                                }
                            }
                            throw new AbortError(error?.message ?? "Unknown error")
                        },
                        maxRetries: envConfig().timeConfig.retry.maxRetries,
                        delay: envConfig().timeConfig.retry.delay,
                        factor: envConfig().timeConfig.retry.factor,
                        log: false,
                    })
                } catch (error) {
                    if (error.message === RpcErrorType.Fatal) {
                        this.logger.error(`Ejecting rpc ${id} because of fatal error`)
                        await this.p2cBalancerService.ejectRpcs(ChainId.Solana, [id])
                        throw error
                    }
                    // if the error is not a fatal error, throw the error, retry are useless in this case
                    throw new AbortError(error.message)
                } 
            },
            maxRetries: envConfig().timeConfig.retry.maxRetries,
            delay: envConfig().timeConfig.retry.delay,
            factor: envConfig().timeConfig.retry.factor,
        })
    }

    private getSuiRpcErrorType(error: Error): RpcErrorType {
        // if the error is a http status error, return the error type
        if (error instanceof SuiHTTPStatusError) {
            // Rate limit / gateway / temporary infra issues
            if ([429, 502, 503, 504].includes(error.status)) {
                return RpcErrorType.Ignorable
            }
            // Unauthorized / forbidden => permanent failure
            if ([401, 403].includes(error.status)) {
                return RpcErrorType.Fatal
            }
            return RpcErrorType.Retryable
        }
        // if the error is a json rpc error, return the error type
        if (error instanceof JsonRpcError) {
            if (RETRYABLE_JSON_RPC_CODES.has(error.code)) {
                return RpcErrorType.Retryable
            }
            return RpcErrorType.Fatal
        }
        // if the error is not a http status error or a json rpc error, return the error type
        return RpcErrorType.Ignorable
    }

    public async withSuiClient<TResponse = void>({
        callback,
        accessType,
    }: WithSuiClientParams<TResponse>): Promise<TResponse> {  
        return await this.retryService.retry({
            action: async () => {
                // take the url from the p2c balancer
                const { url: rpcUrl, id } = this.p2cBalancerService.balance({
                    chainId: ChainId.Sui,
                    // in sui, we support only http transport
                    transport: RpcTransport.Http,
                    accessType: accessType,
                })
                this.logger.debug(`RPC URL: ${rpcUrl}`)
                // create the sui client
                const suiClient = new SuiClient({
                    url: rpcUrl,
                    network: "mainnet",
                })
                // try to call the rpc for 3 times
                try {
                    // try to call the rpc
                    return await this.retryService.retry({
                        action: async () => {
                            // resolve the tuple of response and error
                            const [response, error] = await this.asyncService.resolveTuple(
                                callback(suiClient)
                            )
                            // if the response is not null, return the response
                            if (response !== null) {
                                return response
                            }
                            if (error === null) {
                                throw new AbortError("Unknown error")
                            }
                            const errorType = this.getSuiRpcErrorType(error)
                            console.log(errorType)
                            if (errorType === RpcErrorType.Fatal) {
                                throw new AbortError(RpcErrorType.Fatal)
                            }
                            if (errorType === RpcErrorType.Retryable) {
                                throw new SuiRpcRetryableError(error?.message)
                            }
                            throw new AbortError(error?.message ?? "Unknown error")
                        },
                        maxRetries: envConfig().timeConfig.retry.maxRetries,
                        delay: envConfig().timeConfig.retry.delay,
                        factor: envConfig().timeConfig.retry.factor,
                        log: false,
                    })
                } catch (error) {
                    // if the error is a fatal error, eject the rpc
                    if (error.message === RpcErrorType.Fatal) {
                        this.logger.error(`Ejecting rpc ${id} because of fatal error`)
                        await this.p2cBalancerService.ejectRpcs(ChainId.Sui, [id])
                        throw error
                    }
                    throw new AbortError(error.message)
                }
            },
            maxRetries: envConfig().timeConfig.retry.maxRetries,
            delay: envConfig().timeConfig.retry.delay,
            factor: envConfig().timeConfig.retry.factor,
            log: false,
        })  
    }   
}

export interface WithSolanaRpcParams<TResponse = void> {
    callback: (params: WithSolanaRpcCallbackParams) => Promise<TResponse>
    accessType: RpcAccessType
    requiredWs?: boolean
}

export interface WithSolanaRpcCallbackParams {
    rpc: Rpc<SolanaRpcApi>
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
}

export interface WithSuiClientParams<TResponse = void> {
    callback: (client: SuiClient) => Promise<TResponse>
    accessType: RpcAccessType
}   