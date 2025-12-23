import { Injectable } from "@nestjs/common"
import { RetryService } from "@modules/mixin"
import { 
    createSolanaRpc, 
    createSolanaRpcSubscriptions, 
    Rpc, 
    RpcSubscriptions, 
    SolanaRpcApi, 
    SolanaRpcSubscriptionsApi
} from "@solana/kit"
import { SuiClient } from "@mysten/sui/client"
import { httpsToWss } from "@utils"
import { P2CBalancerService, RpcTransport } from "@modules/p2c-balancer"
import { ChainId } from "@typedefs"

@Injectable()
export class RpcPickerService {
    constructor(
        private readonly p2cBalancerService: P2CBalancerService,
        private readonly retryService: RetryService,
    ) {}

    public async withSolanaRpc<TResponse = void>({
        callback,
        clientType,
        withoutRetry = false,
    }: WithSolanaRpcParams<TResponse>): Promise<TResponse> {  
        // take the url from the p2c balancer
        const httpUrl = this.p2cBalancerService.balance(ChainId.Solana, RpcTransport.Http)
        const wsUrl = this.p2cBalancerService.balance(ChainId.Solana, RpcTransport.Ws)
        let lastError: unknown = null
        // Try primary first
        try {
            const rpc = createSolanaRpc(httpUrl)
            const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(wsUrl))
            if (withoutRetry) {
                return await callback({ rpc, rpcSubscriptions })
            }
            return await this.retryService.retry({
                action: () => callback({ rpc, rpcSubscriptions }),
                maxRetries: 2,
                delay: 1000,
                factor: 2,
            })
        } catch (error) {
            lastError = error
        }
        // Fallback to others
        for (const fallbackUrl of restUrls) {
            try {
                const rpc = createSolanaRpc(fallbackUrl)
                const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(fallbackUrl))
                return await this.retryService.retry({
                    action: () => callback({ rpc, rpcSubscriptions }),
                    maxRetries: 2,
                    delay: 1000,
                    factor: 2,
                })
            } catch (error) {
                lastError = error
            }
        }
        // if everything fails
        throw lastError
    }

    public async withSuiClient<TResponse = void>({
        callback,
        clientType,
        withoutRetry = false,
    }: WithSuiClientParams<TResponse>): Promise<TResponse> {
        const urls = await this.getUrls({ loadBalancerName: mainLoadBalancerName, clientType })
        // pick the best endpoint via P2C
        const primaryUrl = this.loadBalancerService.balanceP2c(
            mainLoadBalancerName,
            urls,
        )
        if (withoutRetry) {
            return callback(
                new SuiClient({
                    url: primaryUrl,
                    network: "mainnet",
                }))
        }
        // fallback endpoints
        const restUrls = urls.filter(u => u !== primaryUrl)
        let lastError: unknown = null
        // try primary RPC first
        try {
            const client = new SuiClient({
                url: primaryUrl,
                network: "mainnet",
            })
            return await this.retryService.retry({
                action: () => callback(client),
                maxRetries: 2,
                delay: 1000,
                factor: 2,
            })
        } catch (err) {
            lastError = err
        }
    
        // fallback to other RPCs
        for (const fallbackUrl of restUrls) {
            try {
                const client = new SuiClient({
                    url: fallbackUrl,
                    network: "mainnet",
                })
    
                return await this.retryService.retry({
                    action: () => callback(client),
                    maxRetries: 2,
                    delay: 1000,
                    factor: 2,
                })
            } catch (err) {
                lastError = err
            }
        }
    
        // if everything fails
        throw lastError
    }
}

export interface WithSolanaRpcParams<TResponse = void> {
    callback: (params: WithSolanaRpcCallbackParams) => Promise<TResponse>
    clientType: ClientType
    withoutRetry?: boolean
}

export interface WithSolanaRpcCallbackParams {
    rpc: Rpc<SolanaRpcApi>
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
}

export interface GetUrlsParams {
    loadBalancerName: LoadBalancerName
    clientType: ClientType
}

export interface WithSuiClientParams<TResponse = void> {
    callback: (client: SuiClient) => Promise<TResponse>
    clientType: ClientType
}   

export enum ClientType {
    Read = "read",
    Write = "write",
}