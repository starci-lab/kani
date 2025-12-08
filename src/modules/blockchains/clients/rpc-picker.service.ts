import { Injectable } from "@nestjs/common"
import { LoadBalancerService, RetryService } from "@modules/mixin"
import { LoadBalancerName, PrimaryMemoryStorageService } from "@modules/databases"
import { createSolanaRpc, createSolanaRpcSubscriptions, Rpc, RpcSubscriptions, SolanaRpcApi, SolanaRpcSubscriptionsApi } from "@solana/kit"
import { LoadBalancerNameNotFoundException } from "@exceptions"
import { SuiClient } from "@mysten/sui/client"
import { httpsToWss } from "@utils"

@Injectable()
export class RpcPickerService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly loadBalancerService: LoadBalancerService,
        private readonly retryService: RetryService,
    ) {}

    public async getUrls(
        {
            loadBalancerName,
            clientType,
        }: GetUrlsParams
    ): Promise<Array<string>> {
        switch (loadBalancerName) {
        case LoadBalancerName.SolanaBalance: {
            return this.primaryMemoryStorageService.clientConfig.solanaBalanceClientRpcs[clientType]
        }
        case LoadBalancerName.JupiterAggregator: {
            return this.primaryMemoryStorageService.clientConfig.jupiterAggregatorClientRpcs[clientType]
        }
        case LoadBalancerName.MeteoraDlmm: {
            return this.primaryMemoryStorageService.clientConfig.meteoraDlmmClientRpcs[clientType]
        }
        case LoadBalancerName.RaydiumClmm: {
            return this.primaryMemoryStorageService.clientConfig.raydiumClmmClientRpcs[clientType]
        }
        case LoadBalancerName.OrcaClmm: {
            return this.primaryMemoryStorageService.clientConfig.orcaClmmClientRpcs[clientType]
        }
        case LoadBalancerName.SuiBalance: {
            return this.primaryMemoryStorageService.clientConfig.suiBalanceClientRpcs[clientType]
        }
        case LoadBalancerName.CetusAggregator: {
            return this.primaryMemoryStorageService.clientConfig.cetusAggregatorClientRpcs[clientType]
        }
        case LoadBalancerName.SevenKAggregator: {
            return this.primaryMemoryStorageService.clientConfig.sevenKAggregatorClientRpcs[clientType]
        }
        case LoadBalancerName.CetusClmm: {
            return this.primaryMemoryStorageService.clientConfig.cetusClmmClientRpcs[clientType]
        }
        case LoadBalancerName.TurbosClmm: {
            return this.primaryMemoryStorageService.clientConfig.turbosClmmClientRpcs[clientType]
        }
        case LoadBalancerName.MomentumClmm: {
            return this.primaryMemoryStorageService.clientConfig.momentumClmmClientRpcs[clientType]
        }
        case LoadBalancerName.FlowXClmm: {
            return this.primaryMemoryStorageService.clientConfig.flowXClmmClientRpcs[clientType]
        }
        default:
            throw new LoadBalancerNameNotFoundException("Invalid load balancer name")
        }
    }

    public async withSolanaRpc<TResponse = void>({
        mainLoadBalancerName,
        callback,
        clientType,
        withoutRetry = false,
    }: WithSolanaRpcParams<TResponse>): Promise<TResponse> {  
        const urls = await this.getUrls({ loadBalancerName: mainLoadBalancerName, clientType })
        // pick the first endpoint
        const primaryUrl = this.loadBalancerService.balanceP2c(
            mainLoadBalancerName,
            urls,
        ) 
        // fallback endpoints
        const restUrls = urls.filter(u => u !== primaryUrl)
    
        let lastError: unknown = null
    
        // Try primary first
        try {
            const rpc = createSolanaRpc(primaryUrl)
            const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(primaryUrl))
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
        mainLoadBalancerName,
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
    mainLoadBalancerName: LoadBalancerName
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
    mainLoadBalancerName: LoadBalancerName
    callback: (client: SuiClient) => Promise<TResponse>
    clientType: ClientType
    withoutRetry?: boolean
}   

export enum ClientType {
    Read = "read",
    Write = "write",
}