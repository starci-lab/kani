import {
    QuoteParams, QuoteResult, SwapParams 
} from "./aggregator.interface"
import {
    AggregatorId 
} from "@modules/typedefs"
import {
    TransactionObjectArgument, Transaction 
} from "@mysten/sui/transactions"

/**
 * Params for batch quote request.
 * Directly reused from QuoteRequest.
 */
export type BatchQuoteParams = QuoteParams

/**
 * One result entry returned from an aggregator
 * when calling batchQuote.
 */
export interface BatchQuoteResult {
    response: QuoteResult
    aggregatorId: AggregatorId
}

/**
 * Base params for select-and-execute swap.
 * aggregatorId decides which aggregator to call.
 */
export interface SelectorSwapParams {
    base: SwapParams
    aggregatorId: AggregatorId
}

/**
 * Unified swap response payload.
 * Each aggregator returns its own internal payload format.
 */
export interface SelectorSwapResult {
    payload: unknown
    outputCoin?: TransactionObjectArgument
    txb?: Transaction
}

export interface IAggregatorSelectorService {
    batchQuote(params: BatchQuoteParams): Promise<BatchQuoteResult>
    selectorSwap(params: SelectorSwapParams): Promise<SelectorSwapResult>
}