import BN from "bn.js"
import Decimal from "decimal.js"

/** Parameters for finding the optimal tick range for liquidity provision. */
export interface FindOptimalTickRangeParams {
    /** Amount of target token available to provide as liquidity. */
    targetBalanceAmount: BN
    /** Amount of quote token available to provide as liquidity. */
    quoteBalanceAmount: BN
    /** Current tick index of the pool. */
    tickCurrent: BN
    /** Minimum tick spacing allowed by the pool (determines valid tick positions). */
    tickSpacing: Decimal
    /** Multiplier used to determine the number of tick range candidates to evaluate. */
    tickMultiplier: Decimal
    /** Whether the target token is token A. */
    targetIsA: boolean
}

/** Result containing the optimal tick range bounds. */
export interface FindOptimalTickRangeResult {
    /** Lower bound of the optimal tick range. */
    tickLower: BN
    /** Upper bound of the optimal tick range. */
    tickUpper: BN
    /** Score of the optimal tick range. */
    utilizationPercentage: Decimal
    /** Amount of target token used. */
    amountA: BN
    /** Amount of quote token used. */
    amountB: BN
    /** Liquidity provided. */
    liquidity: BN
}

/** Candidate range score for tick range evaluation. */
export interface CandidateRangeScore {
    tickLower: BN
    tickUpper: BN
    utilizationPercentage: Decimal
    amountA: BN
    amountB: BN
    liquidity: BN
}
