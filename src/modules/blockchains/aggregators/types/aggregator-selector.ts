import {
    QuoteParams, QuoteResult, SwapParams 
} from "./aggregator"
import {
    AggregatorId 
} from "../enums"
import {
    TransactionObjectArgument, Transaction 
} from "@mysten/sui/transactions"

/** Parameters for batch quote request. */
export type BatchQuoteParams = QuoteParams

/** One result entry returned from an aggregator when calling batchQuote. */
export interface BatchQuoteResult {
    response: QuoteResult
    aggregatorId: AggregatorId
}

/** Base params for select-and-execute swap. aggregatorId decides which aggregator to call. */
export interface SelectorSwapParams {
    base: SwapParams
    aggregatorId: AggregatorId
}

/** Unified swap response payload. Each aggregator returns its own internal payload format. */
export interface SelectorSwapResult {
    payload: unknown
    outputCoin?: TransactionObjectArgument
    txb?: Transaction
}

/** Interface for aggregator selector service that can batch quote and select aggregators. */
export interface IAggregatorSelectorService {
    batchQuote(params: BatchQuoteParams): Promise<BatchQuoteResult>
    selectorSwap(params: SelectorSwapParams): Promise<SelectorSwapResult>
}
