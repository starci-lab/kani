import {
    Injectable 
} from "@nestjs/common"
import {
    IAggregatorService, QuoteParams, QuoteResult, SwapParams, SwapResult 
} from "./types"
import {
    AggregatorClient, RouterDataV3 
} from "@cetusprotocol/aggregator-sdk"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    SuiClient 
} from "@mysten/sui/client"
import {
    RetryService 
} from "@modules/mixin"
import { 
    AggregatorQuoteFailedException,
    AggregatorSwapFailedException,
    QuoteNotFoundException,
} from "@modules/exceptions"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    ChainId 
} from "../enums"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    envConfig 
} from "@modules/env"
import {
    AggregatorId 
} from "./enums"

/**
 * Service responsible for Cetus Aggregator operations.
 * Handles quote requests and swap execution for Sui blockchain.
 *
 * @example
 * const service = new CetusAggregatorService(...)
 * const quote = await service.quote({ tokenIn, tokenOut, amountIn, senderAddress })
 */
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

    /**
     * Requests a swap quote from Cetus Aggregator.
     *
     * @param param - Quote parameters
     * @returns Quote result with amount out and payload
     *
     * @example
     * const quote = await service.quote({ tokenIn, tokenOut, amountIn, senderAddress })
     */
    async quote({ tokenIn, amountIn, tokenOut }: QuoteParams): Promise<QuoteResult> {
        try {
            // execute quote request with Sui client
            return await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    // create Cetus aggregator client
                    const cetusAggregatorClient = this.createCetusAggregatorClient(suiClient)
                    
                    // find best routing path
                    const quote = await cetusAggregatorClient.findRouters({
                        from: tokenIn.tokenAddress,
                        target: tokenOut.tokenAddress,
                        amount: amountIn,
                        byAmountIn: true,
                    })
                    
                    // validate quote exists
                    if (!quote) {
                        throw new QuoteNotFoundException({
                            from: tokenIn.tokenAddress,
                            target: tokenOut.tokenAddress,
                            amount: amountIn,
                        })
                    }
                    
                    // return formatted quote result
                    return {
                        amountOut: quote.amountOut,
                        payload: quote,
                    }
                },
            })
        } catch (error) {
            // wrap error with aggregator context
            throw new AggregatorQuoteFailedException({
                aggregatorId: AggregatorId.CetusAggregator,
                originalError: error,
            })
        }
    }
    /**
     * Executes a swap transaction using Cetus Aggregator.
     *
     * @param param - Swap parameters
     * @returns Swap result with output coin and transaction
     *
     * @example
     * const result = await service.swap({ payload, tokenIn, tokenOut, accountAddress, txb, inputCoin })
     */
    async swap({ payload, txb, inputCoin, accountAddress }: SwapParams): Promise<SwapResult> {
        try {
            // cast payload to router data type
            const _payload = payload as unknown as RouterDataV3 
            
            // execute swap with Sui client
            return await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    // create Cetus aggregator client
                    const cetusAggregatorClient = this.createCetusAggregatorClient(suiClient)
                    const _txb = txb || new Transaction()
                    _txb.setSender(accountAddress)
                    
                    // get slippage configuration
                    const { transaction: { swap: { slippage } } } = envConfig()
                    
                    // execute swap with retry mechanism
                    const outputCoin = await this.retryService.retry({
                        action: async () => {
                            // use fast swap if no input coin provided
                            if (!inputCoin) {
                                await cetusAggregatorClient.fastRouterSwap({
                                    router: _payload,
                                    slippage,
                                    txb: _txb,
                                })
                                return undefined
                            }
                            
                            // use standard swap with input coin
                            return await cetusAggregatorClient.routerSwap({
                                router: _payload,
                                slippage,
                                txb: _txb,
                                inputCoin,
                            })
                        }
                    })
                    
                    // return swap result
                    return {
                        outputCoin,
                        payload: null,
                        txb: _txb,
                    }
                },
            })
        } catch (error) {
            // wrap error with aggregator context
            throw new AggregatorSwapFailedException({
                aggregatorId: AggregatorId.CetusAggregator,
                originalError: error,
            })
        }
    }
}