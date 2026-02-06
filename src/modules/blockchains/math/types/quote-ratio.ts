import {
    Decimal
} from "decimal.js"
import {
    TokenSchema
} from "@modules/databases"
import BN from "bn.js"

/** Parameters for computing quote ratio. */
export interface ComputeQuoteRatioParams {
    targetToken: TokenSchema
    quoteToken: TokenSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
}

/** Result of computing quote ratio. */
export interface ComputeQuoteRatioResult {
    quoteRatio: Decimal
    totalBalanceInTargetAmount: Decimal
    targetBalanceInTargetAmount: Decimal
    quoteBalanceInTargetAmount: Decimal
    relativePrice: Decimal
}

/** Parameters for checking quote ratio status. */
export interface CheckQuoteRatioStatusParams {
    quoteRatio: Decimal
}
