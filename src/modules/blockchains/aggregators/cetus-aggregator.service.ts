import { Injectable } from "@nestjs/common"
import { IAggregatorService, QuoteRequest, QuoteResponse, SwapRequest, SwapResponse } from "./aggregator.interface"
import { AggregatorClient, RouterDataV3 } from "@cetusprotocol/aggregator-sdk"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { RpcExecutorService } from "@modules/blockchains"
import { SuiClient } from "@mysten/sui/client"
import { RetryService } from "@modules/mixin"
import { 
    QuoteNotFoundException, 
    TokenNotFoundException, 
} from "@exceptions"
import { Transaction } from "@mysten/sui/transactions"
import { ChainId } from "@typedefs"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"

@Injectable()
export class CetusAggregatorService implements IAggregatorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly retryService: RetryService,
    ) {}

    supportedChains(): Array<ChainId> {
        return [ChainId.Sui]
    }

    private createCetusAggregatorClient(client: SuiClient): AggregatorClient {
        return new AggregatorClient({
            client,
        })
    }

    async quote(
        {
            tokenIn,
            amountIn,
            tokenOut,
        }: QuoteRequest
    ): Promise<QuoteResponse> {
        const tokenInInstance = this.primaryMemoryStorageService.tokens.find(
            token => token.displayId === tokenIn,
        )
        if (!tokenInInstance) {
            throw new TokenNotFoundException(`Token not found with display id: ${tokenIn}`)
        }
        const tokenOutInstance = this.primaryMemoryStorageService.tokens.find(
            token => token.displayId === tokenOut,
        )
        if (!tokenOutInstance) {
            throw new TokenNotFoundException(`Token not found with display id: ${tokenOut}`)
        }

        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Read,
            callback: async ({ suiClient }) => {
                const cetusAggregatorClient = this.createCetusAggregatorClient(suiClient)
                const quote = await cetusAggregatorClient.findRouters({
                    from: tokenInInstance.tokenAddress,
                    target: tokenOutInstance.tokenAddress,
                    amount: amountIn,
                    byAmountIn: true,
                })
                if (!quote) {
                    throw new QuoteNotFoundException("No quote found")
                }
                return {
                    amountOut: quote.amountOut,
                    payload: quote,
                }   
            },
        })
    }
    async swap({ 
        payload, 
        txb,
        inputCoin
    }: SwapRequest): Promise<SwapResponse> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                const cetusAggregatorClient = this.createCetusAggregatorClient(suiClient)
                const _txb = txb || new Transaction()
                const router = payload as RouterDataV3 
                // no slippage
                const slippage = 0.999
                const outputCoin = await this.retryService.retry({
                    action: async () => {
                        if (!inputCoin) {
                            await cetusAggregatorClient.fastRouterSwap({
                                router,
                                slippage,
                                txb: _txb,
                            })
                            return undefined
                        }
                        return await cetusAggregatorClient.routerSwap({
                            router,
                            slippage,
                            txb: _txb,
                            inputCoin,
                        })
                    },
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    delay: envConfig().timeConfig.retry.delay,
                    factor: envConfig().timeConfig.retry.factor,
                })
                return {
                    outputCoin,
                    payload: null,
                    txb
                }
            },
        })
    }
}