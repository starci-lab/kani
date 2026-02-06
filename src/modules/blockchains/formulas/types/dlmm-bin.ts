import BN from "bn.js"
import Decimal from "decimal.js"

/**
 * Parameters for converting active bin id to price (with decimals).
 */
export interface ActiveIdToPriceParams {
    /**
     * Active bin index (DLMM discrete price level)
     */
    activeId: BN

    /**
     * Decimals of token A
     */
    decimalsA: Decimal

    /**
     * Decimals of token B
     */
    decimalsB: Decimal

    /**
     * Basis points denominator (default: 10_000)
     */
    basisPointMax?: number

    /**
     * Bin step in basis points
     * Example:
     *  - binStep = 25  -> 0.25% per bin
     */
    binStep: number
}

/**
 * Parameters for converting active bin id to raw price.
 */
export interface ActiveIdToPriceRawParams {
    /**
     * Active bin index
     */
    activeId: BN

    /**
     * Bin step in basis points
     */
    binStep: number

    /**
     * Basis points denominator
     */
    basisPointMax?: number
}

/**
 * Result of converting active bin id to raw price.
 */
export interface ActiveIdToPriceRawResult {
    /**
     * Raw DLMM price (without decimals)
     */
    price: Decimal
}

/**
 * Result of converting active bin id to price.
 */
export interface ActiveIdToPriceResult {
    /**
     * Human-readable price (token A / token B)
     */
    price: Decimal
}
