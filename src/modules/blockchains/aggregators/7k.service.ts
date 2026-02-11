import {
    Injectable
} from "@nestjs/common"
import {
    IAggregatorService, QuoteParams, QuoteResult, SwapParams, SwapResult
} from "./types"
import {
    RetryService
} from "@modules/mixin"
import {
    AggregatorQuoteFailedException,
    AggregatorSwapFailedException,
    TokenNotFoundException
} from "@modules/exceptions"
import {
    Transaction
} from "@mysten/sui/transactions"
import {
    ChainId
} from "@modules/common"
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
} from "./enums"

/**
 * Service responsible for 7K Protocol aggregator operations.
 * Handles quote requests and swap execution for Sui blockchain.
 *
 * @example
 * const service = new SevenKAggregatorService(...)
 * const quote = await service.quote({ tokenIn, tokenOut, amountIn, senderAddress })
 */
@Injectable()
export class SevenKAggregatorService implements IAggregatorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly retryService: RetryService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly mountStorageService: MountStorageService,
    ) { }

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
    /**
     * Requests a swap quote from 7K Protocol.
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
            await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    // configure 7K SDK with Sui client
                    SevenK.setSuiClient(suiClient)
                },
            })
            // request quote from 7K Protocol
            const quote = await SevenK.getQuote({
                amountIn: amountIn.toString(),
                tokenIn: tokenIn.tokenAddress,
                tokenOut: tokenOut.tokenAddress,
                commissionBps: 2,
            })
            // return formatted quote result
            return {
                amountOut: new BN(quote.returnAmountWithDecimal),
                payload: quote,
            }
        } catch (error) {
            // wrap error with aggregator context
            throw new AggregatorQuoteFailedException({
                aggregatorId: AggregatorId.SevenK,
                originalError: error,
            })
        }
    }

    /**
     * Executes a swap transaction using 7K Protocol.
     *
     * @param param - Swap parameters
     * @returns Swap result with output coin and transaction
     *
     * @example
     * const result = await service.swap({ payload, tokenIn, tokenOut, accountAddress, txb })
     */
    async swap({ payload, txb, accountAddress, tokenIn }: SwapParams): Promise < SwapResult > {
        try {
        // cast payload to 7K quote response type
            const _payload = payload as SevenKQuoteResponse
            const _txb = txb || new Transaction()

            // find token instance from storage
            const tokenInInstance = this.primaryMemoryStorageService.tokenCollection.findOne({
                displayId: {
                    $eq: tokenIn,
                },
            })
            if(!tokenInInstance) {
                throw new TokenNotFoundException({
                    displayId: tokenIn.displayId,
                })
            }

            // fetch and merge input coins
            const { sourceCoin: inputCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                txb: _txb,
                owner: accountAddress,
                coinType: tokenInInstance.tokenAddress,
                requiredAmount: new BN(_payload.swapAmountWithDecimal),
            })

            // execute swap with retry mechanism
            return await this.retryService.retry({
                action: async () => {
                    return await this.rpcExecutorService.withSuiClient({
                        accessType: RpcAccessType.Http,
                        callback: async ({ suiClient }) => {
                        // configure 7K SDK with Sui client
                            SevenK.setSuiClient(suiClient)
                            const finalTxb = txb || new Transaction()
                            finalTxb.setSender(accountAddress)

                            // get commission configuration
                            const { fees: { swapReferral: { sui: { feeToAddress, bps } } } } = this.mountStorageService.appConfig
                            const { transaction: { swap: { slippage } } } = envConfig()

                            // build swap transaction
                            const { coinOut, tx } = await SevenK.buildTx({
                                quoteResponse: _payload,
                                accountAddress,
                                slippage,
                                commission: {
                                    partner: feeToAddress,
                                    commissionBps: bps,
                                },
                                extendTx: {
                                    tx: finalTxb,
                                    coinIn: inputCoin.coinArg,
                                },
                            })

                            // convert transaction format if needed
                            return {
                                outputCoin: coinOut,
                                payload: null,
                                txb: tx instanceof BluefinXTx ? Transaction.from(tx.txBytes) : (tx as Transaction),
                            }
                        }
                    })
                },
            })
        } catch(error) {
        // wrap error with aggregator context
            throw new AggregatorSwapFailedException({
                aggregatorId: AggregatorId.SevenK,
                originalError: error,
            })
        }
    }
}