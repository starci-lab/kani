import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import { Q128, Q64 } from "@utils"
import { ClmmUtilsService } from "./clmm-utils.service"

/**
 * CLMM Reserves Formula Service
 *
 * Implements Uniswap V3-style reserve calculation for concentrated liquidity positions:
 *
 * - Token amounts are calculated based on current tick relative to position range
 * - Three cases are handled:
 *   1. Current tick below range: only token A
 *   2. Current tick within range: both tokens A and B
 *   3. Current tick above range: only token B
 *
 * Formulas use fixed-point arithmetic with configurable modulus:
 *  - priceDiv = Q64 (default for Q64.64 sqrt prices)
 *  - Supports Q128 for extended precision if needed
 *
 * Defaults:
 *  - priceDiv = Q64 (Q64 fixed-point; >> 64)
 */
@Injectable()
export class ClmmReservesFormulaService {
    constructor(
        private readonly clmmUtilsService: ClmmUtilsService,
    ) {}

    /**
     * Calculate token deltas (amounts) for a liquidity position.
     *
     * Implements Uniswap V3-style concentrated liquidity math:
     *
     * Case 1: Current tick below position range (tickCurrent < tickLower)
     *   - Only token A is present
     *   - deltaA = liquidity × (sqrtPriceUpper - sqrtPriceLower) × priceDiv / (sqrtPriceLower × sqrtPriceUpper)
     *   - deltaB = 0
     *
     * Case 2: Current tick within position range (tickLower <= tickCurrent < tickUpper)
     *   - Both tokens are present
     *   - deltaA = liquidity × (sqrtPriceUpper - sqrtPriceCurrent) × priceDiv / (sqrtPriceCurrent × sqrtPriceUpper)
     *   - deltaB = liquidity × (sqrtPriceCurrent - sqrtPriceLower) / priceDiv
     *
     * Case 3: Current tick above position range (tickCurrent >= tickUpper)
     *   - Only token B is present
     *   - deltaA = 0
     *   - deltaB = liquidity × (sqrtPriceUpper - sqrtPriceLower) / priceDiv
     *
     * @param params - Calculation parameters
     * @returns Object containing deltaA and deltaB token amounts
     */
    public calculateLiquidityTokenDeltas(
        {
            tickCurrent,
            sqrtPriceX64,
            tickLower,
            tickUpper,
            sqrtPriceLowerX64,
            sqrtPriceUpperX64,
            liquidity,
            priceDiv = Q64,
        }: CalculateLiquidityTokenDeltasParams
    ): CalculateLiquidityTokenDeltasResponse {
        // Case 1: below range
        if (tickCurrent.lessThan(tickLower)) {
            const deltaA = liquidity
                .mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64))
                .mul(priceDiv)
                .div(sqrtPriceLowerX64.mul(sqrtPriceUpperX64))
            return { deltaA, deltaB: new BN(0) }
        }

        // Case 2: in range
        if (tickCurrent.lessThan(tickUpper)) {
            const deltaA = liquidity
                .mul(sqrtPriceUpperX64.sub(sqrtPriceX64))
                .mul(priceDiv)
                .div(sqrtPriceX64.mul(sqrtPriceUpperX64))
            const deltaB = liquidity
                .mul(sqrtPriceX64.sub(sqrtPriceLowerX64))
                .div(priceDiv)

            return { deltaA, deltaB }
        }

        // Case 3: above range
        const deltaB = liquidity
            .mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64))
            .div(priceDiv)
        return { deltaA: new BN(0), deltaB }
    }
}

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface CalculateLiquidityTokenDeltasParams {
    /**
     * Current pool tick
     */
    tickCurrent: Decimal

    /**
     * Current sqrt price in Q64 format
     */
    sqrtPriceX64: BN

    /**
     * Lower tick of the position
     */
    tickLower: Decimal

    /**
     * Upper tick of the position
     */
    tickUpper: Decimal

    /**
     * Sqrt price at lower tick in Q64 format
     */
    sqrtPriceLowerX64: BN

    /**
     * Sqrt price at upper tick in Q64 format
     */
    sqrtPriceUpperX64: BN

    /**
     * Liquidity amount (unsigned)
     */
    liquidity: BN

    /**
     * Divisor for price calculations (default: Q64)
     * Controls fixed-point scaling for sqrt price arithmetic
     */
    priceDiv?: typeof Q64 | typeof Q128
}

export interface CalculateLiquidityTokenDeltasResponse {
    deltaA: BN
    deltaB: BN
}