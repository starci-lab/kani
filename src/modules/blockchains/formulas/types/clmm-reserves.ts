import BN from "bn.js"
import Decimal from "decimal.js"
import {
    Q128,
    Q64,
    Q96
} from "@modules/utils"

/**
 * Parameters for computing token reserves for a CLMM position.
 */
export interface CalculateReservesParams {
    /**
     * Lower tick of the position
     */
    tickLower: BN
    /**
     * Upper tick of the position
     */
    tickUpper: BN
    /**
     * Current sqrt price
     */
    tickCurrent: BN
    /**
     * Liquidity amount (unsigned)
     */
    liquidity: BN
    /**
     * Fixed point scale for sqrt price
     * Controls fixed-point scaling for sqrt price arithmetic
     */
    fixedPointScale?: typeof Q64 | typeof Q96 | typeof Q128
    /**
     * Decimals of token A
     */
    decimalsA: Decimal
    /**
     * Decimals of token B
     */
    decimalsB: Decimal
}

/**
 * Result of computing token reserves for a CLMM position.
 */
export interface CalculateReservesResult {
    reserveA: Decimal
    reserveB: Decimal
}
