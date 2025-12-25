import { Injectable } from "@nestjs/common"
import { IAggregatorService, QuoteRequest, QuoteResponse, SwapRequest, SwapResponse } from "./aggregator.interface"
import { SuiClient } from "@mysten/sui/client"
import { RetryService } from "@modules/mixin"
import { 
    CoinArgumentNotFoundException, 
    TokenNotFoundException
} from "@exceptions"
import { Transaction } from "@mysten/sui/transactions"
import { ChainId } from "@typedefs"
import SevenK, { QuoteResponse as SevenKQuoteResponse } from "@7kprotocol/sdk-ts"
import { PrimaryMemoryStorageService } from "@modules/databases"
import BN from "bn.js"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"

@Injectable()
export class SevenKAggregatorService implements IAggregatorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly retryService: RetryService,
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    supportedChains(): Array<ChainId> {
        return [ChainId.Sui]
    }

    private createSevenKAggregatorClient(suiClient: SuiClient): typeof SevenK {
        SevenK.Config.setSuiClient(suiClient)
        return SevenK
    }

    async quote(
        {
            tokenIn,
            amountIn,
            tokenOut,
        }: QuoteRequest
    ): Promise<QuoteResponse> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Read,
            callback: async ({ suiClient }) => {
                const sevenKAggregatorClient = this.createSevenKAggregatorClient(suiClient)
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
                return await this.retryService.retry({
                    action: async () => {  
                        const quote = await sevenKAggregatorClient.getQuote({
                            amountIn: amountIn.toString(),
                            tokenIn: tokenInInstance.tokenAddress,
                            tokenOut: tokenOutInstance.tokenAddress,    
                            commissionBps: 2,   
                        })
                        return {
                            amountOut: new BN(quote.returnAmountWithDecimal),
                            payload: quote,
                        }   
                    },
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    delay: envConfig().timeConfig.retry.delay,
                    factor: envConfig().timeConfig.retry.factor,
                })
            },
        })
    }

    async swap(
        { 
            payload, 
            inputCoin, 
            txb,
            accountAddress
        }: SwapRequest): Promise<SwapResponse> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                const sevenKAggregatorClient = this.createSevenKAggregatorClient(suiClient)
                if (!inputCoin) {
                    throw new CoinArgumentNotFoundException("Input coin is required")
                }
                txb = txb || new Transaction()
                return await this.retryService.retry({
                    action: async () => {   
                        const { coinOut } = await sevenKAggregatorClient.buildTx({
                            quoteResponse: payload as SevenKQuoteResponse,
                            accountAddress,
                            slippage: 0.999,
                            commission: {
                                partner: "0xb36ba968411da3eda4f9703010e602a9493398d293503483add061f0143d3212",
                                commissionBps: 2,
                            },    
                        })
                        return {
                            outputCoin: coinOut,
                            payload: null,
                            txb,
                        }
                    },
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    delay: envConfig().timeConfig.retry.delay,
                    factor: envConfig().timeConfig.retry.factor,
                })
            },
        })
    }
}