import { Injectable } from "@nestjs/common"
import { AsyncService, RetryService } from "@modules/mixin"
import { 
    createSolanaRpc, 
    createSolanaRpcSubscriptions, 
    isSolanaError, 
    Rpc, 
    RpcSubscriptions, 
    SolanaRpcApi, 
    SolanaRpcSubscriptionsApi
} from "@solana/kit"
import { SuiClient } from "@mysten/sui/client"
import { httpsToWss } from "@utils"
import { P2CBalancerService, RpcTransport } from "@modules/p2c-balancer"
import { ChainId } from "@typedefs"
import { RpcAccessType } from "@modules/filesystem"
import { AbortError } from "p-retry"
import Decimal from "decimal.js"
import { MaxLoopReachedException } from "@exceptions"
import { envConfig } from "@modules/env"

export class RpcFailoverRequiredError extends Error {}


@Injectable()
export class RpcExecutorService {
    constructor(
        private readonly p2cBalancerService: P2CBalancerService,
        private readonly retryService: RetryService,
        private readonly asyncService: AsyncService,
    ) {}

    public async withSolanaRpc<TResponse = void>({
        callback,
        accessType,
        requiredWs = false,
    }: WithSolanaRpcParams<TResponse>): Promise<TResponse> {  
        let maxLoop = new Decimal(10)
        while (true) {
            maxLoop = maxLoop.minus(1)
            if (maxLoop.lessThan(0)) {
                throw new MaxLoopReachedException("Max loop reached")
            }
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
                            throw new AbortError(error)
                        }
                        // if the error is not a solana error, throw a RpcFailoverRequiredError
                        throw new RpcFailoverRequiredError()
                    },
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    delay: envConfig().timeConfig.retry.delay,
                    factor: envConfig().timeConfig.retry.factor,
                })
            } catch (error) {
                if (error instanceof RpcFailoverRequiredError) {
                    await this.p2cBalancerService.ejectRpcs(ChainId.Solana, [id])
                    continue
                }
                throw error
            }
        }   
    }

    public async withSuiClient<TResponse = void>({
        callback,
        accessType,
    }: WithSuiClientParams<TResponse>): Promise<TResponse> {  
        let maxLoop = new Decimal(10)
        while (true) {
            maxLoop = maxLoop.minus(1)
            if (maxLoop.lessThan(0)) {
                throw new MaxLoopReachedException("Max loop reached")
            }
            // take the url from the p2c balancer
            const { url: rpcUrl, id } = this.p2cBalancerService.balance({
                chainId: ChainId.Sui,
                // in sui, we support only http transport
                transport: RpcTransport.Http,
                accessType: accessType,
            })
            // create the sui client
            const suiClient = new SuiClient({
                url: rpcUrl,
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
                        // if the error is a solana error, throw the error
                        if (isSolanaError(error)) {
                            throw new AbortError(error)
                        }
                        // if the error is not a solana error, throw a RpcFailoverRequiredError
                        throw new RpcFailoverRequiredError()
                    },
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    delay: envConfig().timeConfig.retry.delay,
                    factor: envConfig().timeConfig.retry.factor,
                })
            } catch (error) {
                if (error instanceof RpcFailoverRequiredError) {
                    await this.p2cBalancerService.ejectRpcs(ChainId.Solana, [id])
                    continue
                }
                throw error
            }
        }   
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