import {
    Injectable 
} from "@nestjs/common"
import {
    IAggregatorService, QuoteParams, QuoteResult, SwapParams, SwapResult 
} from "./aggregator.interface"
import {
    RetryService 
} from "@modules/mixin"
import { 
    AggregatorQuoteFailedException,
    AggregatorSwapFailedException,
    TokenNotFoundException
} from "@exceptions"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    ChainId 
} from "@typedefs"
import SevenK, {
    BluefinXTx, QuoteResponse as SevenKQuoteResponse 
} from "@7kprotocol/sdk-ts"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import BN from "bn.js"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    envConfig 
} from "@modules/env"
import {
    SelectCoinsService 
} from "../tx-builder"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    AggregatorId 
} from "./types"

@Injectable()
export class SevenKAggregatorService implements IAggregatorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly retryService: RetryService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    supportedChains(): Array<ChainId> {
        return [ChainId.Sui]
    }

    /**
     * Requests a swap quote from 7K Protocol.
     *
     * This method:
     * - Finds token metadata from in-memory storage
     * - Calls 7K Protocol's getQuote endpoint
     * - Returns quote with return amount
     * - Wraps the request inside a retry mechanism
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
                    SevenK.setSuiClient(suiClient)
                    const tokenInInstance = this.primaryMemoryStorageService.tokenCollection.findOne({
                        displayId: {
                            $eq: tokenIn,
                        },
                    })
                    if (!tokenInInstance) {
                        throw new TokenNotFoundException({
                            displayId: tokenIn,
                        })
                    }
                    const tokenOutInstance = this.primaryMemoryStorageService.tokenCollection.findOne({
                        displayId: {
                            $eq: tokenOut,
                        },
                    })
                    if (!tokenOutInstance) {
                        throw new TokenNotFoundException({
                            displayId: tokenOut,
                        })
                    }
                    return await this.retryService.retry({
                        action: async () => {  
                            const quote = await SevenK.getQuote({
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
                    })
                },
            })
        } catch (error) {
            throw new AggregatorQuoteFailedException({
                aggregatorId: AggregatorId.SevenK,
                originalError: error,
            })
        }
    }

    /**
     * Executes a swap transaction using 7K Protocol.
     *
     * This method:
     * - Fetches and merges input coins
     * - Builds swap transaction from quote response
     * - Includes commission configuration
     * - Wraps the request inside a retry mechanism
     */
    async swap(
        {
            payload,
            txb,
            accountAddress,
            tokenIn,
        }: SwapParams
    ): Promise<SwapResult> {
        try {
            const _payload = payload as SevenKQuoteResponse
            const _txb = txb || new Transaction()
            const tokenInInstance = this.primaryMemoryStorageService.tokenCollection.findOne({
                displayId: {
                    $eq: tokenIn,
                },
            })
            if (!tokenInInstance) {
                throw new TokenNotFoundException({
                    displayId: tokenIn,
                })
            }
            const { sourceCoin: inputCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                txb: _txb,
                owner: accountAddress,
                coinType: tokenInInstance.tokenAddress,
                requiredAmount: new BN(_payload.swapAmountWithDecimal),
            })
            return await this.retryService.retry({
                action: async () => {
                    return await this.rpcExecutorService.withSuiClient({
                        accessType: RpcAccessType.Http,
                        callback: async ({ suiClient }) => {
                            SevenK.setSuiClient(suiClient)
                            const finalTxb = txb || new Transaction()
                            finalTxb.setSender(accountAddress)
                            // get the input coin
                            const { coinOut, tx } = await SevenK.buildTx({
                                quoteResponse: _payload,
                                accountAddress,
                                slippage: envConfig().transaction.swap.slippage,
                                commission: {
                                    partner: this.mountStorageService.appConfig.fees.swapReferral.sui.feeToAddress,
                                    commissionBps: this.mountStorageService.appConfig.fees.swapReferral.sui.bps,
                                },
                                extendTx: {
                                    tx: finalTxb,
                                    coinIn: inputCoin.coinArg,
                                },
                            })
                            return {
                                outputCoin: coinOut,
                                payload: null,
                                txb: tx instanceof BluefinXTx ? Transaction.from(tx.txBytes) : (tx as Transaction),
                            }
                        }
                    })     
                },
            })
        } catch (error) {
            throw new AggregatorSwapFailedException({
                aggregatorId: AggregatorId.SevenK,
                originalError: error,
            })
        }
    }
}