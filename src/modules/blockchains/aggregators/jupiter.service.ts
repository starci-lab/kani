import {
    createJupiterApiClient, QuoteResponse as JupiterQuoteResponse, SwapApi 
} from "@jup-ag/api"
import {
    Injectable 
} from "@nestjs/common"
import {
    IAggregatorService, QuoteParams, QuoteResult, SwapParams, SwapResult 
} from "./aggregator.interface"
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
} from "@modules/typedefs"
import {
    address 
} from "@solana/kit"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    AggregatorId 
} from "@modules/typedefs"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"

const SOLANA_NATIVE_TOKEN_ADDRESS = address("So11111111111111111111111111111111111111112")

@Injectable()
export class JupiterService implements IAggregatorService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        // Generic retry helper to re-run any async action with backoff
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
     * This method:
     * - Finds token metadata (mint address) from in-memory storage
     * - Calls Jupiter's quote endpoint
     * - Wraps the request inside a retry mechanism (max 10 attempts)
     *
     * Reasons for retrying:
     * Jupiter's API may temporarily fail during high TPS windows or RPC congestion.
     */
    async quote(
        {
            tokenIn,
            tokenOut,
            amountIn,
        }: QuoteParams
    ): Promise<QuoteResult> {
        // We wrap the whole quote flow inside the retry service
        try {
            return await this.retryService.retry({
                action: async () => {
                // Resolve token metadata from internal storage
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
                    const client = this.createJupiterClient()
                    // Call Jupiter to fetch the best quote route
                    const quote = await client.quoteGet({
                        inputMint: tokenInInstance.tokenAddress || SOLANA_NATIVE_TOKEN_ADDRESS,
                        outputMint: tokenOutInstance.tokenAddress || SOLANA_NATIVE_TOKEN_ADDRESS,
                        amount: amountIn.toNumber(),
                        platformFeeBps: this.mountStorageService.appConfig.fees.swapReferral.solana.bps,
                        slippageBps: new Decimal(envConfig().transaction.swap.slippage).mul(10000).toNumber(),
                    })
                    return {
                        amountOut: new BN(quote.outAmount),
                        payload: quote,
                    }
                },
            })
        } catch (error) {
            throw new AggregatorQuoteFailedException({
                aggregatorId: AggregatorId.Jupiter,
                originalError: error,
            })
        }
    }

    /**
     * Executes a swap transaction using Jupiter.
     *
     * This method:
     * - Creates a Jupiter client
     * - Builds swap transaction from quote response
     * - Includes referral fee configuration
     * - Wraps the request inside a retry mechanism
     */
    async swap(
        {
            payload,
            accountAddress,
        }: SwapParams
    ): Promise<SwapResult> {
        try {
            const referralTokenAccount = this.jupiterReferralTokenAccountAddress()
            return await this.retryService.retry({
                action: async () => {
                    const client = this.createJupiterClient()
                    const { 
                        swapTransaction
                    } = await client.swapPost({
                        swapRequest: {
                            quoteResponse: payload as JupiterQuoteResponse,
                            userPublicKey: accountAddress,
                            dynamicComputeUnitLimit: true,
                            dynamicSlippage: true,
                            feeAccount: referralTokenAccount,   
                        } 
                    })
                    return {
                        payload: swapTransaction,
                    }
                },
            })
        } catch (error) {
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

