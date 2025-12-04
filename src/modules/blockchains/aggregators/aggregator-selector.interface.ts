import { QuoteRequest, QuoteResponse, SwapRequest } from "./aggregator.interface"
import { AggregatorId } from "./types"
import { TransactionObjectArgument, Transaction } from "@mysten/sui/transactions"

/**
 * Params for batch quote request.
 * Directly reused from QuoteRequest.
 */
export type BatchQuoteParams = QuoteRequest

/**
 * One result entry returned from an aggregator
 * when calling batchQuote.
 */
export interface BatchQuoteResponse {
    response: QuoteResponse
    aggregatorId: AggregatorId
}

/**
 * Base params for select-and-execute swap.
 * aggregatorId decides which aggregator to call.
 */
export interface SelectorSwapParams {
    base: SwapRequest
    aggregatorId: AggregatorId
}

/**
 * Unified swap response payload.
 * Each aggregator returns its own internal payload format.
 */
export interface SelectorSwapResponse {
    payload: unknown
    outputCoin?: TransactionObjectArgument
    txb?: Transaction
}

export interface IAggregatorSelectorService {
    batchQuote(params: BatchQuoteParams): Promise<BatchQuoteResponse>
    selectorSwap(params: SelectorSwapParams): Promise<SelectorSwapResponse>
}