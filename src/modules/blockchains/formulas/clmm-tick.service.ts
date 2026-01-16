import { Injectable } from "@nestjs/common"
import { BN, Decimal } from "turbos-clmm-sdk"
import { TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"

/**
 * CLMM Tick / Price formula service
 *
 * This service wraps a TickMath implementation and provides:
 *  - tick -> sqrtPriceX64
 *  - sqrtPriceX64 -> spot price
 *  - tick -> spot price
 *
 * The math model follows Uniswap V3-style CLMM design.
 *
 * Implementation note:
 *  - Current TickMath backend is imported from `@cetusprotocol/cetus-sui-clmm-sdk`
 */
@Injectable()
export class ClmmTickFormulaService {

    /**
     * Convert tick index to sqrt price (Q64 fixed point)
     *
     * tickIndex:
     *  - Discrete price index used by CLMM
     *  - Each tick represents a fixed price ratio step
     *
     * sqrtPriceX64:
     *  - sqrt(price) represented in Q64 fixed-point format
     *  - price = (sqrtPriceX64 / 2^64)^2
     *
     * Note:
     *  - We rely on the imported TickMath implementation for correctness
     *  - This is equivalent to Uniswap V3 tick -> sqrtPrice logic
     */
    public tickToSqrtPriceX64(
        {
            tickIndex,
        }: TickToSqrtPriceX64Params
    ): BN {
        // Use TickMath implementation to compute sqrtPriceX64
        return TickMath.tickIndexToSqrtPriceX64(tickIndex.toNumber())
    }

    /**
     * Convert sqrtPriceX64 to human-readable spot price
     *
     * sqrtPriceX64:
     *  - sqrt(price) in Q64 fixed-point
     *
     * decimalsA / decimalsB:
     *  - Token A and Token B decimals
     *  - Used to normalize raw price into human-readable value
     *
     * Returned price:
     *  - price of token A in terms of token B
     */
    public sqrtPriceX64ToPrice(
        {
            sqrtPriceX64,
            decimalsA,
            decimalsB,
        }: SqrtPriceX64ToPriceParams
    ): Decimal {
        return TickMath.sqrtPriceX64ToPrice(
            sqrtPriceX64,
            decimalsA,
            decimalsB
        )
    }

    /**
     * Convert tick index directly to spot price
     *
     * Internally equivalent to:
     *  tickIndex -> sqrtPriceX64 -> price
     *
     * This helper is useful when:
     *  - You don't need intermediate sqrt price
     *  - You want a clean tick -> price conversion
     */
    public tickToPrice(
        {
            tickIndex,
            decimalsA,
            decimalsB,
        }: TickToPriceParams
    ): Decimal {
        return TickMath.tickIndexToPrice(
            tickIndex.toNumber(),
            decimalsA,
            decimalsB
        )
    }
}

/**
 * Params for tick -> sqrtPriceX64 conversion
 */
export interface TickToSqrtPriceX64Params {
    /**
     * CLMM tick index (discrete price step)
     */
    tickIndex: Decimal
}

/**
 * Params for sqrtPriceX64 -> price conversion
 */
export interface SqrtPriceX64ToPriceParams {
    /**
     * sqrt(price) in Q64 fixed-point format
     */
    sqrtPriceX64: BN

    /**
     * Decimals of token A
     */
    decimalsA: number

    /**
     * Decimals of token B
     */
    decimalsB: number
}

/**
 * Params for tick -> price conversion
 */
export interface TickToPriceParams {
    /**
     * CLMM tick index
     */
    tickIndex: Decimal

    /**
     * Decimals of token A
     */
    decimalsA: number

    /**
     * Decimals of token B
     */
    decimalsB: number
}