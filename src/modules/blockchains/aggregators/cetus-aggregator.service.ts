import { Injectable } from "@nestjs/common"
import { IAggregatorService, QuoteRequest, QuoteResponse, SwapRequest, SwapResponse } from "./aggregator.interface"
import { AggregatorClient, RouterDataV3 } from "@cetusprotocol/aggregator-sdk"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { LoadBalancerService } from "@modules/mixin"
import { SuiClient } from "@mysten/sui/client"
import { RetryService } from "@modules/mixin"
import { 
    QuoteNotFoundException, 
    TokenNotFoundException, 
} from "@exceptions"
import { Transaction } from "@mysten/sui/transactions"
import { ChainId } from "@typedefs"

const balancerName = "cetus-aggregator"
@Injectable()
export class CetusAggregatorService implements IAggregatorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly loadBalancerService: LoadBalancerService,
        private readonly retryService: RetryService,
    ) {}

    supportedChains(): Array<ChainId> {
        return [ChainId.Sui]
    }

    private createCetusAggregatorClient(): AggregatorClient {
        return new AggregatorClient({
            client: new SuiClient({
                url: this.loadBalancerService.balanceP2c(
                    balancerName, 
                    this.primaryMemoryStorageService.clientConfig.cetusAggregatorClientRpcs.read
                ),
                network: "mainnet",
            }),
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

        const client = this.createCetusAggregatorClient()
        return await this.retryService.retry({
            action: async () => {   
                const quote = await client.findRouters({
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
            maxRetries: 3,
            delay: 500,
            factor: 2,
        })
    }

    async swap(
        { 
            payload, 
            inputCoin, 
            txb 
        }: SwapRequest): Promise<SwapResponse> {
        txb = txb || new Transaction()
        const client = this.createCetusAggregatorClient()
        const router = payload as RouterDataV3 
        // no slippage
        const slippage = 0.999
        const outputCoin = await this.retryService.retry({
            action: async () => {
                if (!inputCoin) {
                    await client.fastRouterSwap({
                        router,
                        slippage,
                        txb,
                    })
                    return undefined
                }
                return await client.routerSwap({
                    router,
                    slippage,
                    txb,
                    inputCoin,
                })
            },
            maxRetries: 3,
            delay: 500,
            factor: 2,
        })
        return {
            outputCoin,
            payload: null,
            txb
        }
    }
}