import { createJupiterApiClient, QuoteResponse as JupiterQuoteResponse, SwapApi } from "@jup-ag/api"
import { Injectable, Logger } from "@nestjs/common"
import { IAggregatorService, QuoteRequest, QuoteResponse, SwapRequest, SwapResponse } from "./aggregator.interface"
import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { TokenNotFoundException } from "@exceptions"
import BN from "bn.js"
import { RetryService } from "@modules/mixin"
import { ChainId } from "@typedefs"
import { Address, address } from "@solana/kit"
const SOLANA_NATIVE_TOKEN_ADDRESS = address("So11111111111111111111111111111111111111112")

@Injectable()
export class JupiterService implements IAggregatorService {
    private readonly logger = new Logger(JupiterService.name)
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        // Generic retry helper to re-run any async action with backoff
        private readonly retryService: RetryService,
    ) { }

    private jupiterReferralTokenAccounts(): Partial<Record<TokenId, Address>> {
        return {
            [TokenId.SolNative]: address("JRiWp4o5k9mJSKbp9DsbkZw1FHQNWmJCDDa6aUYKHzn"),
            [TokenId.SolUsdc]: address("7n59ZyqB6i3aoakFvF8TneHYGHhnwUNEYMHmvJMLz37R"),
            [TokenId.SolUsdt]: address("J3dpR4zciXDr75wTXzSMT28tYwpVEdMTJT5G7v58TfMz"),
        }
    }

    private createJupiterClient(): SwapApi {
        return createJupiterApiClient({
            apiKey: "bf7f948e-1a9c-4cf9-8d6f-5c0d9effcfdb",
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
                        // we charge 0.02% platform fee as protocol fee
                        platformFeeBps: 2,
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
            // Retry config
            maxRetries: 3, // up to 3 attempts
            delay: 500,     // 500ms initial delay
            factor: 2,      // exponential backoff factor
        })
    }

    async swap(
        {
            payload,
            tokenOut,
            accountAddress,
        }: 
    SwapRequest): 
    Promise<SwapResponse> 
    {
        return await this.retryService.retry({
            action: async () => {
                const referralTokenAccount = this.jupiterReferralTokenAccounts()[tokenOut]?.toString()
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
            },
            maxRetries: 10,
            delay: 200,
            factor: 2,
        })
    }

    supportedChains(): Array<ChainId> {
        return [ChainId.Solana]
    }
}
