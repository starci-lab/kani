import {
    createJupiterApiClient, QuoteResponse as JupiterQuoteResponse, SwapApi 
} from "@jup-ag/api"
import {
    Injectable 
} from "@nestjs/common"
import {
    IAggregatorService, QuoteParams, QuoteResult, SwapParams, SwapResult 
} from "./types"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    AggregatorQuoteFailedException,
    AggregatorSwapFailedException,
    TokenNotFoundException 
} from "@modules/exceptions"
import BN from "bn.js"
import {
    RetryService 
} from "@modules/mixin"
import {
    ChainId 
} from "@modules/common"
import {
    address 
} from "@solana/kit"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    AggregatorId 
} from "./enums"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"

const SOLANA_NATIVE_TOKEN_ADDRESS = address("So11111111111111111111111111111111111111112")

/**
 * Service responsible for Jupiter aggregator operations.
 * Handles quote requests and swap execution for Solana blockchain.
 *
 * @example
 * const service = new JupiterService(...)
 * const quote = await service.quote({ tokenIn, tokenOut, amountIn, senderAddress })
 */
@Injectable()
export class JupiterService implements IAggregatorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly retryService: RetryService,    
        private readonly mountStorageService: MountStorageService,
    ) { }

    private jupiterReferralTokenAccountAddress(): string {
        return this.mountStorageService.appConfig.fees.swapReferral.solana.referralTokenAccountAddress || ""
    }

    private createJupiterClient(): SwapApi {
        return createJupiterApiClient({
            apiKey: this.mountStorageService.appConfig.jupiter,
        })
    }

    /**
     * Requests a swap quote from Jupiter.
     *
     * @param param - Quote parameters
     * @returns Quote result with amount out and payload
     *
     * @example
     * const quote = await service.quote({ tokenIn, tokenOut, amountIn, senderAddress })
     */
    async quote({ tokenIn, tokenOut, amountIn }: QuoteParams): Promise<QuoteResult> {
        try {
            // execute quote request with retry mechanism
            // find token instances from storage
            const tokenInInstance = this.primaryMemoryStorageService.tokenCollection.findOne({
                id: {
                    $eq: tokenIn.id,
                },
            })
            if (!tokenInInstance) {
                throw new TokenNotFoundException({
                    displayId: tokenIn.displayId,
                })
            }
                    
            const tokenOutInstance = this.primaryMemoryStorageService.tokenCollection.findOne({
                id: {
                    $eq: tokenOut.id,
                },
            })
            if (!tokenOutInstance) {
                throw new TokenNotFoundException({
                    displayId: tokenOut.displayId,
                })
            }
                    
            // create Jupiter client
            const client = this.createJupiterClient()
                    
            // get fee and slippage configuration
            const { fees: { swapReferral: { solana: { bps } } } } = this.mountStorageService.appConfig
            const { transaction: { swap: { slippage } } } = envConfig()
                
            const quote = await client.quoteGet(
                {
                    inputMint: tokenInInstance.tokenAddress || SOLANA_NATIVE_TOKEN_ADDRESS,
                    outputMint: tokenOutInstance.tokenAddress || SOLANA_NATIVE_TOKEN_ADDRESS,
                    amount: amountIn.toNumber(),
                    platformFeeBps: bps,
                    slippageBps: new Decimal(slippage).mul(10000).toNumber(),
                }
            )  
            // return formatted quote result
            return {
                amountOut: new BN(quote.outAmount),
                payload: quote,
            }
        } catch (error) {
            // wrap error with aggregator context
            throw new AggregatorQuoteFailedException({
                aggregatorId: AggregatorId.Jupiter,
                originalError: error,
            })
        }
    }

    /**
     * Executes a swap transaction using Jupiter.
     *
     * @param param - Swap parameters
     * @returns Swap result with transaction payload
     *
     * @example
     * const result = await service.swap({ payload, accountAddress })
     */
    async swap({ payload, accountAddress }: SwapParams): Promise<SwapResult> {
        try {
            // get referral token account address
            const referralTokenAccount = this.jupiterReferralTokenAccountAddress()
            
            // execute swap with retry mechanism
            return await this.retryService.retry({
                action: async () => {
                    // create Jupiter client
                    const client = this.createJupiterClient()  
                    // build swap transaction
                    const { swapTransaction } = await client.swapPost({
                        swapRequest: {
                            quoteResponse: payload as JupiterQuoteResponse,
                            userPublicKey: accountAddress,
                            dynamicComputeUnitLimit: true,
                            dynamicSlippage: true,
                            feeAccount: referralTokenAccount,   
                        } 
                    })
                    // return swap transaction
                    return {
                        payload: swapTransaction,
                    }
                },
            })
        } catch (error) {
            // wrap error with aggregator context
            throw new AggregatorSwapFailedException({
                aggregatorId: AggregatorId.Jupiter,
                originalError: error,
            })
        }
    }

    supportedChains(): Array<ChainId> {
        return [ChainId.Solana]
    }
}

