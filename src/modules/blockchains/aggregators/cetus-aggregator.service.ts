import {
    Injectable 
} from "@nestjs/common"
import {
    IAggregatorService, QuoteParams, QuoteResult, SwapParams, SwapResult 
} from "./aggregator.interface"
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
} from "@modules/typedefs"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    envConfig 
} from "@modules/env"
import {
    AggregatorId 
} from "@modules/typedefs"

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
     * This method:
     * - Finds token metadata from in-memory storage
     * - Calls Cetus Aggregator's findRouters endpoint
     * - Returns the best route with amount out
     */
    async quote(
        {
            tokenIn,
            amountIn,
            tokenOut,
        }: QuoteParams
    ): Promise<QuoteResult> {
        try {
            return await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    const cetusAggregatorClient = this.createCetusAggregatorClient(suiClient)
                    const quote = await cetusAggregatorClient.findRouters({
                        from: tokenIn.tokenAddress,
                        target: tokenOut.tokenAddress,
                        amount: amountIn,
                        byAmountIn: true,
                    })
                    if (!quote) {
                        throw new QuoteNotFoundException({
                            from: tokenIn.tokenAddress,
                            target: tokenOut.tokenAddress,
                            amount: amountIn,
                        })
                    }
                    return {
                        amountOut: quote.amountOut,
                        payload: quote,
                    }
                },
            })
        } catch (error) {
            console.log(error)
            throw new AggregatorQuoteFailedException({
                aggregatorId: AggregatorId.CetusAggregator,
                originalError: error,
            })
        }
    }
    /**
     * Executes a swap transaction using Cetus Aggregator.
     *
     * This method:
     * - Creates a Cetus Aggregator client
     * - Builds swap transaction from router data
     * - Handles both with and without input coin scenarios
     * - Wraps the request inside a retry mechanism
     */
    async swap(
        {
            payload,
            txb,
            inputCoin,
            accountAddress,
        }: SwapParams
    ): Promise<SwapResult> {
        try {
            const _payload = payload as unknown as RouterDataV3 
            return await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    const cetusAggregatorClient = this.createCetusAggregatorClient(suiClient)
                    const _txb = txb || new Transaction()
                    _txb.setSender(accountAddress)
                    const outputCoin = await this.retryService.retry({
                        action: async () => {
                            if (!inputCoin) {
                                await cetusAggregatorClient.fastRouterSwap({
                                    router: _payload,
                                    slippage: envConfig().transaction.swap.slippage,
                                    txb: _txb,
                                })
                                return undefined
                            }
                            return await cetusAggregatorClient.routerSwap({
                                router: _payload,
                                slippage: envConfig().transaction.swap.slippage,
                                txb: _txb,
                                inputCoin,
                            })
                        }
                    })
                    return {
                        outputCoin,
                        payload: null,
                        txb: _txb,
                    }
                },
            })
        } catch (error) {
            throw new AggregatorSwapFailedException({
                aggregatorId: AggregatorId.CetusAggregator,
                originalError: error,
            })
        }
    }
}