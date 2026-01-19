import {
    Injectable 
} from "@nestjs/common"
import {
    BN, Decimal 
} from "turbos-clmm-sdk"
import {
    TickMath 
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import {
    Q128, Q64, Q96 
} from "@modules/utils"

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
    public tickToSqrtPrice(
        {
            tickIndex,
            fixedPointScale = Q64,
        }: TickToSqrtPriceParams
    ): BN {
        // Use TickMath implementation to compute sqrtPrice
        const tickIndexX64 = TickMath.tickIndexToSqrtPriceX64(tickIndex.toNumber())
        return tickIndexX64.mul(fixedPointScale).div(Q64)
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
    public sqrtPriceToPrice(
        {
            sqrtPrice,
            decimalsA,
            decimalsB,
            fixedPointScale = Q64,
        }: SqrtPriceToPriceParams
    ): Decimal {
        const sqrtPriceX64 = sqrtPrice.mul(Q64).div(fixedPointScale)
        return TickMath.sqrtPriceX64ToPrice(sqrtPriceX64,
            decimalsA,
            decimalsB)
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
            fixedPointScale = Q64,
        }: TickToPriceParams
    ): Decimal {
        const sqrtPrice = this.tickToSqrtPrice(
            {
                tickIndex,
                fixedPointScale,
            }
        )
        return this.sqrtPriceToPrice(
            {
                sqrtPrice,
                decimalsA,
                decimalsB,
                fixedPointScale,
            }
        )
    }
}

/**
 * Params for tick -> sqrtPriceX64 conversion
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
 * Params for sqrtPriceX64 -> price conversion
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
 * Params for tick -> price conversion
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