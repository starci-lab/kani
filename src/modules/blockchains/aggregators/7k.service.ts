import { Injectable, OnModuleInit } from "@nestjs/common"
import { IAggregatorService, QuoteRequest, QuoteResponse, SwapRequest, SwapResponse } from "./aggregator.interface"
import { LoadBalancerService, ReadinessWatcherFactoryService } from "@modules/mixin"
import { SuiClient } from "@mysten/sui/client"
import { RetryService } from "@modules/mixin"
import { 
    CoinArgumentNotFoundException, 
    TransactionObjectArgumentNotFoundException
} from "@exceptions"
import { Transaction } from "@mysten/sui/dist/cjs/transactions"
import { ChainId } from "@typedefs"
import SevenK, { QuoteResponse as SevenKQuoteResponse } from "@7kprotocol/sdk-ts"
import { PrimaryMemoryStorageService } from "@modules/databases"
import BN from "bn.js"

const balancerName = "7k-aggregator"
@Injectable()
export class SevenKAggregatorService implements IAggregatorService, OnModuleInit {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly loadBalancerService: LoadBalancerService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly retryService: RetryService,
    ) {}

    supportedChains(): Array<ChainId> {
        return [ChainId.Sui]
    }

    async onModuleInit(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        this.loadBalancerService.initP2cBalancerIfNotExists(
            balancerName, 
            this.primaryMemoryStorageService.clientConfig.sevenKAggregatorClientRpcs
        )
    }

    private createSevenKAggregatorClient(): typeof SevenK {
        SevenK.Config.setSuiClient(new SuiClient({
            url: this.loadBalancerService.balanceP2c(balancerName),
            network: "mainnet",
        }))
        return SevenK
    }

    async quote(
        {
            tokenIn,
            amountIn,
            tokenOut,
        }: QuoteRequest
    ): Promise<QuoteResponse> {
        const client = this.createSevenKAggregatorClient()
        return await this.retryService.retry({
            action: async () => {   
                const quote = await client.getQuote({
                    amountIn: amountIn.toString(),
                    tokenIn,
                    tokenOut,    
                    commissionBps: 2      
                })
                return {
                    amountOut: new BN(quote.returnAmount),
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
            txb,
            accountAddress
        }: SwapRequest): Promise<SwapResponse> {
        const client = this.createSevenKAggregatorClient()
        if (!inputCoin) {
            throw new CoinArgumentNotFoundException("Input coin is required")
        }
        const { coinOut } = await this.retryService.retry({
            action: async () => {
                return await client.buildTx({
                    quoteResponse: payload as SevenKQuoteResponse,
                    accountAddress,
                    slippage: 0.999,
                    commission: {
                        partner: "0xb36ba968411da3eda4f9703010e602a9493398d293503483add061f0143d3212",
                        commissionBps: 2,
                    },
                    extendTx: {
                        tx: txb || new Transaction(),
                        coinIn: inputCoin,
                    },
                })
            },
            maxRetries: 3,
            delay: 500,
            factor: 2,
        })
        if (!coinOut) {
            throw new TransactionObjectArgumentNotFoundException("Output coin is required")
        }
        return {
            outputCoin: coinOut,
            payload: null,
            txb,
        }
    }
}