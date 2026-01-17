import { Injectable } from "@nestjs/common"
import { IAggregatorService, QuoteParams, QuoteResult, SwapParams, SwapResult } from "./aggregator.interface"
import { RetryService } from "@modules/mixin"
import { 
    TokenNotFoundException
} from "@exceptions"
import { Transaction } from "@mysten/sui/transactions"
import { ChainId } from "@typedefs"
import SevenK, { BluefinXTx, QuoteResponse as SevenKQuoteResponse } from "@7kprotocol/sdk-ts"
import { PrimaryMemoryStorageService } from "@modules/databases"
import BN from "bn.js"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { envConfig } from "@modules/env"
import { SelectCoinsService } from "../tx-builder"
import { MountStorageService } from "@modules/filesystem"

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

    async quote(
        {
            tokenIn,
            amountIn,
            tokenOut,
        }: QuoteParams
    ): Promise<QuoteResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                SevenK.setSuiClient(suiClient)
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
                    }
                }
                )
            },
        })
    }

    async swap(
        { 
            payload,
            txb,
            accountAddress,
            tokenIn
        }: SwapParams): Promise<SwapResult> {
        const _payload = payload as SevenKQuoteResponse
        txb = txb || new Transaction()
        const tokenInInstance = this.primaryMemoryStorageService.tokens.find(
            token => token.displayId === tokenIn,
        )
        if (!tokenInInstance) {
            throw new TokenNotFoundException(`Token not found with display id: ${tokenIn}`)
        }
        const { sourceCoin: inputCoin } = await this.selectCoinsService.fetchAndMergeCoins({
            txb,
            owner: accountAddress,
            coinType: tokenInInstance.tokenAddress,
            requiredAmount: new BN(_payload.swapAmountWithDecimal),
        })
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                SevenK.setSuiClient(suiClient)
                txb.setSender(accountAddress)
                // get the input coin
                return await this.retryService.retry({
                    action: async () => {
                        const { coinOut, tx } = await SevenK.buildTx({
                            quoteResponse: _payload,
                            accountAddress,
                            slippage: envConfig().slippage.swap,
                            commission: {
                                partner: this.mountStorageService.appConfig.fees.swapReferral.sui.feeToAddress,
                                commissionBps: this.mountStorageService.appConfig.fees.swapReferral.sui.bps,
                            }, 
                            extendTx: {
                                tx: txb,
                                coinIn: inputCoin.coinArg,
                            } 
                        })
                        return {
                            outputCoin: coinOut,
                            payload: null,
                            txb: tx instanceof BluefinXTx ? Transaction.from(tx.txBytes) : tx,
                        }
                    }
                })
            },
        })
    }
}