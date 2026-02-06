import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    TickMath 
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import {
    Q64
} from "@modules/utils"
import {
    TickToSqrtPriceParams,
    SqrtPriceToPriceParams,
    TickToPriceParams
} from "./types"

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
     * Converts tick index to sqrt price (Q64 fixed point).
     *
     * @param param - Parameters for tick to sqrt price conversion
     * @returns Sqrt price in fixed-point format
     */
    public tickToSqrtPrice({
        tickIndex,
        fixedPointScale = Q64,
    }: TickToSqrtPriceParams): BN {
        // Use TickMath implementation to compute sqrtPrice
        const tickIndexX64 = TickMath.tickIndexToSqrtPriceX64(tickIndex.toNumber())
        return tickIndexX64.mul(fixedPointScale).div(Q64)
    }

    /**
     * Converts sqrtPriceX64 to human-readable spot price.
     *
     * @param param - Parameters for sqrt price to price conversion
     * @returns Human-readable price (token A in terms of token B)
     */
    public sqrtPriceToPrice({
        sqrtPrice,
        decimalsA,
        decimalsB,
        fixedPointScale = Q64,
    }: SqrtPriceToPriceParams): Decimal {
        // Convert to Q64 format for TickMath
        const sqrtPriceX64 = sqrtPrice.mul(Q64).div(fixedPointScale)
        return TickMath.sqrtPriceX64ToPrice(sqrtPriceX64,
            decimalsA,
            decimalsB)
    }

    /**
     * Converts tick index directly to spot price.
     *
     * @param param - Parameters for tick to price conversion
     * @returns Human-readable price (token A in terms of token B)
     */
    public tickToPrice({
        tickIndex,
        decimalsA,
        decimalsB,
        fixedPointScale = Q64,
    }: TickToPriceParams): Decimal {
        // Convert tick to sqrt price first
        const sqrtPrice = this.tickToSqrtPrice({
            tickIndex,
            fixedPointScale,
        })

        // Convert sqrt price to human-readable price
        return this.sqrtPriceToPrice({
            sqrtPrice,
            decimalsA,
            decimalsB,
            fixedPointScale,
        })
    }
}
