import { Injectable } from "@nestjs/common"
import { IAggregatorService, QuoteRequest, QuoteResponse, SwapRequest, SwapResponse } from "./aggregator.interface"
import { AggregatorClient, RouterDataV3 } from "@cetusprotocol/aggregator-sdk"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { LoadBalancerService } from "@modules/mixin"
import { SuiClient } from "@mysten/sui/client"
import { RetryService } from "@modules/mixin"
import { 
    CoinArgumentNotFoundException, 
    QuoteNotFoundException, 
    TransactionObjectArgumentNotFoundException
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
                    this.primaryMemoryStorageService.clientConfig.cetusAggregatorClientRpcs
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
        const client = this.createCetusAggregatorClient()
        return await this.retryService.retry({
            action: async () => {   
                const quote = await client.findRouters({
                    from: tokenIn,
                    target: tokenOut,
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
        const client = this.createCetusAggregatorClient()
        const router = payload as RouterDataV3 
        if (!inputCoin) {
            throw new CoinArgumentNotFoundException("Input coin is required")
        }
        const outputCoin = await this.retryService.retry({
            action: async () => {
                return await client.routerSwap({
                    router: router,
                    // no slippage
                    slippage: 0.999,
                    txb: txb || new Transaction(),
                    inputCoin: inputCoin,
                })
            },
            maxRetries: 3,
            delay: 500,
            factor: 2,
        })
        if (!outputCoin) {
            throw new TransactionObjectArgumentNotFoundException("Output coin is required")
        }
        return {
            outputCoin,
            payload: null,
            txb
        }
    }
}