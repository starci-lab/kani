import { Injectable } from "@nestjs/common"
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
import { P2CBalancerService } from "@modules/p2c-balancer"
import { ChainId } from "@typedefs"
import { RpcAccessType } from "@modules/filesystem"
import { AbortError } from "p-retry"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

// Retryable RPC error indicating a temporary failure that blocks progress
// (e.g. request timeout, transient cluster issues, blockhash expiration,
// or temporary on-chain execution failure).
// Safe to retry with backoff; do not ban/eject the RPC endpoint.
export class SolanaRpcRetryableError extends Error {}
export class SolanaRpcFatalError extends Error {}
export class SolanaRpcIgnorableError extends Error {}
export class SuiRpcRetryableError extends Error {}
export class SuiRpcFatalError extends Error {}
export class SuiRpcIgnorableError extends Error {}

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
    constructor(
        private readonly p2cBalancerService: P2CBalancerService,
        private readonly retryService: RetryService,
        private readonly asyncService: AsyncService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
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
            return RpcErrorType.Ignorable
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
            return RpcErrorType.Ignorable
        }
        // =========================
        // CLUSTER / TRANSACTION RUNTIME
        // (7050000–7050015)
        // =========================
        if (code >= 7050000 && code <= 7050015) {
            // blockhash expired, account in use, cluster maintenance, etc.
            return RpcErrorType.Ignorable
        }
        // =========================
        // RPC SUBSCRIPTIONS
        // (8190000–8190004)
        // =========================
        if (code >= 8190000 && code <= 8190004) {
            // websocket dropped, channel closed, reconnect needed
            return RpcErrorType.Ignorable
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
    }: WithSolanaRpcParams<TResponse>): Promise<TResponse> {
        return await this.retryService.retry(
            {
                action: async () => {
                // take the url from the p2c balancer
                    const { url: rpcUrl, id } = this.p2cBalancerService.balance(
                        {
                            chainId: ChainId.Solana,
                            // in solana, we use ws for write operations and http for read operations, because they share the same url
                            accessType,
                        }
                    )
                    // create the rpc and rpc subscriptions
                    let rpc: Rpc<SolanaRpcApi>
                    let rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
                    // if the access type is ws, create the rpc subscriptions
                    if (accessType === RpcAccessType.Http) {
                        rpc = createSolanaRpc(rpcUrl)     
                    } else if (accessType === RpcAccessType.Ws) {
                    // if the access type is http, create the rpc
                        rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl)
                    } else {
                        rpc = createSolanaRpc(rpcUrl)
                        const { url: wsUrl } = this.p2cBalancerService.balance(
                            {
                                chainId: ChainId.Solana,
                                accessType: RpcAccessType.Ws,
                            }
                        )
                        rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl)
                    }
                    try {
                        return await this.retryService.retry(
                            {
                                action: async () => {
                                // resolve the tuple of response and error
                                    const [
                                        response, 
                                        error
                                    ] = await this.asyncService.resolveTuple(
                                        callback(
                                            { 
                                                rpc, 
                                                rpcSubscriptions,
                                                rpcUrl
                                            }
                                        )
                                    )
                                    // if the response is not null, return the response
                                    if (response !== null) {
                                        return response
                                    }
                                    console.log(error)
                                    // if the error is a solana error, throw the error
                                    if (isSolanaError(error)) {
                                        const errorType = this.getSolanaRpcErrorType(error)
                                        switch (errorType) {
                                        case RpcErrorType.Fatal:
                                            throw new AbortError(new SolanaRpcFatalError(error?.message))
                                        case RpcErrorType.Retryable:
                                            throw new SolanaRpcRetryableError(error?.message)
                                        case RpcErrorType.Ignorable:
                                            throw new AbortError(new SolanaRpcIgnorableError(error?.message))
                                        }
                                    }
                                    // if the error is not a solana error, throw the error
                                    throw new AbortError(new SolanaRpcIgnorableError(error?.message))
                                },
                                maxRetries: envConfig().timeConfig.retry.maxRetries,
                                delay: envConfig().timeConfig.retry.delay,
                                factor: envConfig().timeConfig.retry.factor,
                            }
                        )
                    } catch (error) {
                        if (error instanceof SolanaRpcFatalError) {
                            this.logger.error(
                                WinstonLog.EjectRpcFatalError, 
                                { rpcId: id }
                            )
                            await this.p2cBalancerService.ejectRpcs([id])
                            throw error
                        }
                        throw error
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
            return RpcErrorType.Ignorable
        }
        // if the error is a json rpc error, return the error type
        if (error instanceof JsonRpcError) {
            if (RETRYABLE_JSON_RPC_CODES.has(error.code)) {
                return RpcErrorType.Ignorable
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
                    accessType,
                })
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
                                callback({ suiClient, rpcUrl })
                            )
                            // if the response is not null, return the response
                            if (response !== null) {
                                return response
                            }
                            if (error === null) {
                                throw new AbortError(new SuiRpcIgnorableError("Unknown error"))
                            }
                            const errorType = this.getSuiRpcErrorType(error)
                            switch (errorType) {
                            case RpcErrorType.Fatal:
                                throw new AbortError(new SuiRpcFatalError(error?.message))
                            case RpcErrorType.Retryable:
                                throw new SuiRpcRetryableError(error?.message)
                            case RpcErrorType.Ignorable:
                                throw new AbortError(new SuiRpcIgnorableError(error?.message))
                            }
                        },
                        maxRetries: envConfig().timeConfig.retry.maxRetries,
                        delay: envConfig().timeConfig.retry.delay,
                        factor: envConfig().timeConfig.retry.factor,
                    })
                } catch (error) {
                    // if the error is a fatal error, eject the rpc
                    if (error instanceof SuiRpcFatalError) {
                        this.logger.error(WinstonLog.EjectRpcFatalError, { rpcId: id })
                        await this.p2cBalancerService.ejectRpcs([id])
                        throw error
                    }
                    throw error
                }
            },
            maxRetries: envConfig().timeConfig.retry.maxRetries,
            delay: envConfig().timeConfig.retry.delay,
            factor: envConfig().timeConfig.retry.factor,
        })  
    }   
}

export type WithSolanaRpcParams<TResponse = void> = 
{
    callback: (params: Omit<WithSolanaRpcCallbackParams, "rpcSubscriptions">) => Promise<TResponse>
    accessType: RpcAccessType.Http
} | {
    callback: (params: Omit<WithSolanaRpcCallbackParams, "rpc">) => Promise<TResponse>
    accessType: RpcAccessType.Ws
} | {
    callback: (params: WithSolanaRpcCallbackParams) => Promise<TResponse>
    accessType: RpcAccessType.Write
}

export interface WithSolanaRpcCallbackParams {
    rpc: Rpc<SolanaRpcApi>
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
    rpcUrl: string
}

export type WithSuiClientParams<TResponse = void> = 
{
    callback: (params: WithSuiClientCallbackParams) => Promise<TResponse>
    accessType: RpcAccessType.Http
} | {
    callback: (params: WithSuiClientCallbackParams) => Promise<TResponse>
    accessType: RpcAccessType.Write
}   

export interface WithSuiClientCallbackParams {
    suiClient: SuiClient
    rpcUrl: string
}