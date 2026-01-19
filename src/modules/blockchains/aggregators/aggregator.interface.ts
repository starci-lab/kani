import {
    TokenId 
} from "@modules/databases"
import {
    Transaction, TransactionObjectArgument 
} from "@mysten/sui/transactions"
import {
    ChainId 
} from "@modules/typedefs"
import BN from "bn.js"

/**
 * The core interface for any swap aggregator (Jupiter, Meteora, Raydium, etc.).
 * It returns a quote + executable swap data.
 */
export interface IAggregatorService {
    quote(params: QuoteParams): Promise<QuoteResult>
    swap(params: SwapParams): Promise<SwapResult>
    supportedChains(): Array<ChainId>
}

/**
 * Parameters for requesting a swap quote.
 */
export interface QuoteParams {
    tokenIn: TokenId
    tokenOut: TokenId
    amountIn: BN
    senderAddress: string
    recipientAddress?: string
}

/**
 * Result of a quote from an aggregator.
 */
export interface QuoteResult {
    amountOut: BN
    /** 
     * Raw aggregator-specific data required to execute the swap.
     * This is later passed directly to the swap executor.
     */
    payload: unknown
}

export interface SwapParams {
    payload: unknown
    tokenIn: TokenId
    tokenOut: TokenId
    accountAddress: string
    inputCoin?: TransactionObjectArgument
    txb?: Transaction
}

export interface SwapResult {
    payload: unknown
    outputCoin?: TransactionObjectArgument
    txb?: Transaction
}

