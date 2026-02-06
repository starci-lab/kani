import BN from "bn.js"
import {
    Q128,
    Q64,
    Q96
} from "@modules/common"

/**
 * Parameters for tick -> sqrtPriceX64 conversion.
 */
export interface TickToSqrtPriceParams {
    /**
     * CLMM tick index (discrete price step)
     */
    tickIndex: BN
    /**
     * Divisor for price calculations (default: Q64)
     * Controls fixed-point scaling for sqrt price arithmetic
     */
    fixedPointScale?: typeof Q64 | typeof Q96 | typeof Q128
}

/**
 * Parameters for sqrtPriceX64 -> price conversion.
 */
export interface SqrtPriceToPriceParams {
    /**
     * sqrt(price) in Q64 fixed-point format
     */
    sqrtPrice: BN

    /**
     * Decimals of token A
     */
    decimalsA: number

    /**
     * Decimals of token B
     */
    decimalsB: number

    /**
     * Divisor for price calculations (default: Q64)
     * Controls fixed-point scaling for sqrt price arithmetic
     */
    fixedPointScale?: typeof Q64 | typeof Q96 | typeof Q128
}

/**
 * Parameters for tick -> price conversion.
 */
export interface TickToPriceParams {
    /**
     * CLMM tick index
     */
    tickIndex: BN

    /**
     * Decimals of token A
     */
    decimalsA: number

    /**
     * Decimals of token B
     */
    decimalsB: number

    /**
     * Divisor for price calculations (default: Q64)
     * Controls fixed-point scaling for sqrt price arithmetic
     */
    fixedPointScale?: typeof Q64 | typeof Q96 | typeof Q128
}
