import BN from "bn.js"
import {
    Decimal
} from "decimal.js"
import {
    TokenSchema
} from "@modules/databases"
import {
    ComputeQuoteRatioResult
} from "./quote-ratio"

/** Parameters for computing swap amounts. */
export interface ComputeSwapAmountsParams {
    targetToken: TokenSchema
    quoteToken: TokenSchema
    gasToken: TokenSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
}

/** Swap direction enumeration. */
export enum SwapDirection {
    TargetToQuote = "targetToQuote",
    QuoteToTarget = "quoteToTarget",
    TargetToGas = "targetToGas",
    QuoteToGas = "quoteToGas",
}

/** Single swap step in a swap sequence. */
export interface SwapStep {
    direction: SwapDirection
    usedAmount: BN
    swappedAmount: BN
}

/** Result of computing swap amounts. */
export interface ComputeSwapAmountsResult {
    swapSteps: Array<SwapStep>
    quoteRatioResult: ComputeQuoteRatioResult
}

/** Extended parameters for computing swap amounts with quote ratio result. */
export interface ExtendedComputeSwapAmountsParams extends ComputeSwapAmountsParams {
    quoteRatioResult: ComputeQuoteRatioResult
}

/** Parameters for computing amount out by price. */
export interface ComputeAmountOutByPriceParams {
    amountIn: BN
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    relativePrice: Decimal
}

/** Result of computing amount out by price. */
export interface ComputeAmountOutByPriceResult {
    swapTargetToQuoteAmount: BN
    swapQuoteToTargetAmount: BN
}

/** Rebalance direction enumeration. */
export enum RebalanceDirection {
    QuoteToTarget = "quoteToTarget",
    TargetToQuote = "targetToQuote",
}

/** Parameters for computing rebalance amount. */
export interface ComputeRebalanceAmountParams {
    amount: BN
    currentRatio: Decimal
    targetRatio: Decimal
    targetToken: TokenSchema
    quoteToken: TokenSchema
    direction: RebalanceDirection
    relativePrice: Decimal
}

/** Result of computing rebalance amount. */
export interface ComputeRebalanceAmountResult {
    swappedAmount: BN
    usedAmount: BN
}
