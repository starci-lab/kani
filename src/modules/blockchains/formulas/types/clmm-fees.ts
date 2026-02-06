import BN from "bn.js"
import Decimal from "decimal.js"
import {
    Q128,
    Q64
} from "@modules/common"

/**
 * Parameters for computing fee growth inside a position tick range.
 */
export interface ComputeFeeGrowthInsideParams {
    feeGrowthGlobal: BN
    feeGrowthOutsideLower: BN
    feeGrowthOutsideUpper: BN
    tickCurrent: BN
    tickLower: BN
    tickUpper: BN
    outsideDeltaWrapModulus?: typeof Q128 | typeof Q64
}

/**
 * Parameters for computing fee earned since last checkpoint.
 */
export interface ComputeFeeEarnedParams {
    feeGrowthInside: BN
    feeGrowthInsideLast: BN
    liquidity: BN
    insideDeltaWrapModulus?: typeof Q128 | typeof Q64
    resultDiv?: typeof Q64 | typeof Q128
}

/**
 * Parameters for computing total fees (token A & token B) for a CLMM position.
 */
export interface ComputeFeesParams {
    /**
     * Global fee growth accumulator of the pool (for token A).
     *
     * Monotonically increasing value tracking total fees per unit liquidity,
     * represented in fixed-point (usually Q64.64) and wrapped in u128.
     */
    feeGrowthGlobalA: BN
    /**
     * Global fee growth accumulator of the pool (for token B).
     *
     * Monotonically increasing value tracking total fees per unit liquidity,
     * represented in fixed-point (usually Q64.64) and wrapped in u128.
     */
    feeGrowthGlobalB: BN

    /**
     * Fee growth outside the lower tick boundary (token A).
     *
     * Used to exclude fee growth that occurred below the position range.
     * Stored as wrapped u128.
     */
    feeGrowthOutsideLowerA: BN

    /**
     * Fee growth outside the upper tick boundary (token A).
     *
     * Used to exclude fee growth that occurred above the position range.
     * Stored as wrapped u128.
     */
    feeGrowthOutsideUpperA: BN

    /**
     * Fee growth outside the lower tick boundary (token B).
     *
     * Used to exclude fee growth that occurred below the position range.
     * Stored as wrapped u128.
     */
    feeGrowthOutsideLowerB: BN

    /**
     * Fee growth outside the upper tick boundary (token B).
     *
     * Used to exclude fee growth that occurred above the position range.
     * Stored as wrapped u128.
     */
    feeGrowthOutsideUpperB: BN

    /**
     * Current pool tick (current market price).
     *
     * Determines whether the position is below, inside, or above its range.
     */
    tickCurrent: BN

    /**
     * Lower tick boundary of the liquidity position.
     */
    tickLower: BN

    /**
     * Upper tick boundary of the liquidity position.
     */
    tickUpper: BN

    /**
     * Fee growth inside the position range at the last checkpoint (token A).
     *
     * Used to compute incremental fees earned since the last update.
     * Stored as wrapped u128.
     */
    feeGrowthInsideLastA: BN

    /**
     * Fee growth inside the position range at the last checkpoint (token B).
     *
     * Used to compute incremental fees earned since the last update.
     * Stored as wrapped u128.
     */
    feeGrowthInsideLastB: BN

    /**
     * Liquidity amount of the position (L).
     *
     * This is an unsigned integer representing liquidity units,
     * not a token amount.
     */
    liquidity: BN

    /**
     * Fees already owned by the position for token A.
     *
     * These are fees that have been previously accrued and stored
     * on the position account.
     */
    feeOwnedA?: BN

    /**
     * Fees already owned by the position for token B.
     *
     * These are fees that have been previously accrued and stored
     * on the position account.
     */
    feeOwnedB?: BN

    /**
     * Wrapping modulus used when computing fee growth deltas.
     *
     * Defaults to Q128 to match u128 wrapping behavior
     * used by most CLMM implementations.
     */
    outsideDeltaWrapModulus?: typeof Q128 | typeof Q64

    /**
     * Wrapping modulus used when computing delta growth
     * between two fee growth checkpoints.
     *
     * Defaults to Q128 (u128 wrapping).
     */
    insideDeltaWrapModulus?: typeof Q128 | typeof Q64

    /**
     * Divisor applied when converting fee growth into
     * actual token amounts.
     *
     * Commonly Q64 for Q64.64 fixed-point fee growth values.
     */
    resultDiv?: typeof Q64 | typeof Q128

    /**
     * Decimals of token A.
     */
    decimalsA: Decimal

    /**
     * Decimals of token B.
     */
    decimalsB: Decimal
}

/**
 * Result of computing total fees for a CLMM position.
 */
export interface ComputeFeesResult {
    /**
     * Fees earned for token A.
     */
    feeA: Decimal
    /**
     * Fees earned for token B.
     */
    feeB: Decimal
}
