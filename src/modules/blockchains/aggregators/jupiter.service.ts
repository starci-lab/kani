import { createJupiterApiClient, QuoteResponse as JupiterQuoteResponse, SwapApi } from "@jup-ag/api"
import { Injectable, Logger } from "@nestjs/common"
import { IAggregatorService, QuoteRequest, QuoteResponse, SwapRequest, SwapResponse } from "./aggregator.interface"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { TokenNotFoundException } from "@exceptions"
import BN from "bn.js"
import { RetryService } from "@modules/mixin"
import { ChainId } from "@typedefs"
import { address } from "@solana/kit"
import { MountStorageService } from "@modules/filesystem"

const SOLANA_NATIVE_TOKEN_ADDRESS = address("So11111111111111111111111111111111111111112")

@Injectable()
export class JupiterService implements IAggregatorService {
    private readonly logger = new Logger(JupiterService.name)
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
    async quote({
        tokenIn,
        tokenOut,
        amountIn,
    }: QuoteRequest): Promise<QuoteResponse> {
        // We wrap the whole quote flow inside the retry service
        return await this.retryService.retry({
            action: async () => {
                try {
                    // Resolve token metadata from internal storage
                    const tokenInInstance = this.primaryMemoryStorageService.tokens.find(
                        token => token.displayId === tokenIn,
                    )
                    if (!tokenInInstance) {
                        throw new TokenNotFoundException(
                            `Token not found with display id: ${tokenIn}`
                        )
                    }
                    const tokenOutInstance = this.primaryMemoryStorageService.tokens.find(
                        token => token.displayId === tokenOut,
                    )
                    if (!tokenOutInstance) {
                        throw new TokenNotFoundException(
                            `Token not found with display id: ${tokenOut}`
                        )
                    }
                    const client = this.createJupiterClient()
                    // Call Jupiter to fetch the best quote route
                    const quote = await client.quoteGet({
                        inputMint: tokenInInstance.tokenAddress || SOLANA_NATIVE_TOKEN_ADDRESS,
                        outputMint: tokenOutInstance.tokenAddress || SOLANA_NATIVE_TOKEN_ADDRESS,
                        amount: amountIn.toNumber(),
                        platformFeeBps: this.mountStorageService.appConfig.fees.swapReferral.solana.bps,
                    })
                    return {
                        amountOut: new BN(quote.outAmount),
                        payload: quote,
                    }
                } catch (error) {
                    this.logger.debug(error)
                    throw error
                }
            },
        })
    }

    async swap(
        {
            payload,
            accountAddress,
        }: 
    SwapRequest): 
    Promise<SwapResponse> 
    {
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
            console.log(error)
            this.logger.debug(error)
            throw error
        }
    }

    supportedChains(): Array<ChainId> {
        return [ChainId.Solana]
    }
}
