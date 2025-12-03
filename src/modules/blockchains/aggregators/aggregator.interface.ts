import { TokenId } from "@modules/databases"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import { ChainId } from "@typedefs"
import BN from "bn.js"

/**
 * The core interface for any swap aggregator (Jupiter, Meteora, Raydium, etc.).
 * It returns a quote + executable swap data.
 */
export interface IAggregatorService {
    quote(params: QuoteRequest): Promise<QuoteResponse>
    swap(params: SwapRequest): Promise<SwapResponse>
    supportedChains(): Array<ChainId>
}

/**
 * Parameters for requesting a swap quote.
 */
export interface QuoteRequest {
    tokenIn: TokenId
    tokenOut: TokenId
    amountIn: BN
    senderAddress: string
    recipientAddress?: string
}

/**
 * Result of a quote from an aggregator.
 */
export interface QuoteResponse {
    amountOut: BN
    /** 
     * Raw aggregator-specific data required to execute the swap.
     * This is later passed directly to the swap executor.
     */
    payload: unknown
}

export interface SwapRequest {
    payload: unknown
    tokenIn: TokenId
    tokenOut: TokenId
    accountAddress: string
    inputCoin?: TransactionObjectArgument
    txb?: Transaction
}

export interface SwapResponse {
    payload: unknown
    outputCoin?: TransactionObjectArgument
    txb?: Transaction
}

