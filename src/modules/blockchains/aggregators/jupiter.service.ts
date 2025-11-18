import { SwapApi, QuoteResponse as JupiterQuoteResponse } from "@jup-ag/api"
import { InjectJupiterAggregatorSdk } from "./aggregators.decorators"
import { Injectable, Logger } from "@nestjs/common"
import { IAggregatorService, QuoteRequest, QuoteResponse, SwapRequest, SwapResponse } from "./aggregator.interface"
import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { TokenNotFoundException } from "@exceptions"
import BN from "bn.js"
import { RetryService } from "@modules/mixin"
import { InjectSolanaClients } from "../clients"
import { HttpAndWsClients } from "../clients"
import { ChainId, Network } from "@modules/common"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { Wallet } from "@project-serum/anchor"
import base58 from "bs58"

const SOLANA_NATIVE_TOKEN_ADDRESS = "So11111111111111111111111111111111111111112"
@Injectable()
export class JupiterService implements IAggregatorService {
    private readonly logger = new Logger(JupiterService.name)
    constructor(
        @InjectJupiterAggregatorSdk()
        private readonly jupiterAggregatorSdk: SwapApi,
        @InjectSolanaClients()
        private readonly clients: Record<Network, HttpAndWsClients<Connection>>,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        // Generic retry helper to re-run any async action with backoff
        private readonly retryService: RetryService,
    ) { }

    private jupiterReferralTokenAccounts(): Partial<Record<TokenId, PublicKey>> {
        return {
            [TokenId.SolNative]: new PublicKey("JRiWp4o5k9mJSKbp9DsbkZw1FHQNWmJCDDa6aUYKHzn"),
            [TokenId.SolUsdc]: new PublicKey("7n59ZyqB6i3aoakFvF8TneHYGHhnwUNEYMHmvJMLz37R"),
            [TokenId.SolUsdt]: new PublicKey("J3dpR4zciXDr75wTXzSMT28tYwpVEdMTJT5G7v58TfMz"),
        }
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
                    const tokenOutInstance = this.primaryMemoryStorageService.tokens.find(
                        token => token.displayId === tokenOut,
                    )
                    if (!tokenInInstance || !tokenOutInstance) {
                        throw new TokenNotFoundException(
                            `Token not found with display id: ${tokenIn} or ${tokenOut}`
                        )
                    }
                    // Call Jupiter to fetch the best quote route
                    const quote = await this.jupiterAggregatorSdk.quoteGet({
                        inputMint: tokenInInstance.tokenAddress || SOLANA_NATIVE_TOKEN_ADDRESS,
                        outputMint: tokenOutInstance.tokenAddress || SOLANA_NATIVE_TOKEN_ADDRESS,
                        amount: amountIn.toNumber(),
                        // we charge 0.02% platform fee as protocol fee
                        platformFeeBps: 2,
                    })
                    // Convert output amount to BN and return raw payload
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
            privateKey,
            tokenOut,
        }: 
    SwapRequest): 
    Promise<SwapResponse> 
    {
        return await this.retryService.retry({
            action: async () => {
                const referralTokenAccount = this.jupiterReferralTokenAccounts()[tokenOut]?.toBase58()
                const wallet = new Wallet(Keypair.fromSecretKey(base58.decode(privateKey)))
                return await this.retryService.retry({
                    action: async () => {
                        const { 
                            swapTransaction
                        } = await this.jupiterAggregatorSdk.swapPost({
                            swapRequest: {
                                quoteResponse: payload as JupiterQuoteResponse,
                                userPublicKey: wallet.publicKey.toBase58(),
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
