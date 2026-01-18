import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    Q64, Q96, Q128 
} from "@utils"
import {
    ClmmTickFormulaService 
} from "./clmm-tick.service"
/**
 * CLMM Liquidity Formula Service
 *
 * Computes the maximum liquidity (L) that can be minted
 * from given token amounts (amountA, amountB) for a
 * concentrated liquidity position.
 *
 * This strictly follows Uniswap V3 / Raydium CLMM math.
 *
 * Liquidity behavior:
 *
 * 1) tickCurrent <= tickLower
 *    → only token A is used
 *
 * 2) tickLower < tickCurrent < tickUpper
 *    → both token A and B are used
 *    → liquidity = min(LA, LB)
 *
 * 3) tickCurrent >= tickUpper
 *    → only token B is used
 *
 * All math is done using BN fixed-point arithmetic.
 */
@Injectable()
export class ClmmLiquidityFormulaService {
    constructor(
        private readonly clmmTickFormulaService: ClmmTickFormulaService
    ) {}

    /**
     * Computes liquidity from token amounts.
     */
    public computeLiquidity({
        tickLower,
        tickUpper,
        tickCurrent,
        amountA,
        amountB,
        fixedPointScale = Q64,
    }: ComputeLiquidityParams): BN {
        /**
         * Convert ticks → sqrt prices (fixed-point)
         */
        const sqrtPriceLower = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickLower,
            fixedPointScale,
        })

        const sqrtPriceUpper = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickUpper,
            fixedPointScale,
        })

        const sqrtPriceCurrent = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickCurrent,
            fixedPointScale,
        })
        /**
         * CASE 1:
         * Current price is below range
         * → liquidity entirely from token A
         */
        if (tickCurrent.lte(tickLower)) {
            return this.getLiquidityFromAmountA(
                amountA,
                sqrtPriceLower,
                sqrtPriceUpper,
                fixedPointScale,
            )
        }
        /**
         * CASE 3:
         * Current price is above range
         * → liquidity entirely from token B
         */
        if (tickCurrent.gte(tickUpper)) {
            return this.getLiquidityFromAmountB(
                amountB,
                sqrtPriceLower,
                sqrtPriceUpper,
                fixedPointScale,
            )
        }
        /**
         * CASE 2:
         * Current price is inside range
         * → liquidity limited by min(LA, LB)
         */
        const liquidityFromA = this.getLiquidityFromAmountA(
            amountA,
            sqrtPriceCurrent,
            sqrtPriceUpper,
            fixedPointScale,
        )
        const liquidityFromB = this.getLiquidityFromAmountB(
            amountB,
            sqrtPriceLower,
            sqrtPriceCurrent,
            fixedPointScale,
        )
        return liquidityFromA.lt(liquidityFromB)
            ? liquidityFromA
            : liquidityFromB
    }

    /* ------------------------------------------------------------------ */
    /*                           Internal math                             */
    /* ------------------------------------------------------------------ */

    /**
     * Liquidity from token A
     *
     * L = amountA * sqrt(P_lower) * sqrt(P_upper)
     *     ---------------------------------------
     *           sqrt(P_upper) - sqrt(P_lower)
     */
    private getLiquidityFromAmountA(
        amountA: BN,
        sqrtPriceLower: BN,
        sqrtPriceUpper: BN,
        fixedPointScale: BN,
    ): BN {
        return amountA
            .mul(sqrtPriceLower)
            .mul(sqrtPriceUpper)
            .div(sqrtPriceUpper.sub(sqrtPriceLower))
            .div(fixedPointScale)
    }

    /**
     * Liquidity from token B
     *
     * L = amountB
     *     -----------------------------
     *     sqrt(P_upper) - sqrt(P_lower)
     */
    private getLiquidityFromAmountB(
        amountB: BN,
        sqrtPriceLower: BN,
        sqrtPriceUpper: BN,
        fixedPointScale: BN,
    ): BN {
        return amountB
            .mul(fixedPointScale)
            .div(sqrtPriceUpper.sub(sqrtPriceLower))
    }
}

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface ComputeLiquidityParams {
    /**
     * Lower tick boundary
     */
    tickLower: Decimal

    /**
     * Upper tick boundary
     */
    tickUpper: Decimal

    /**
     * Current pool tick
     */
    tickCurrent: Decimal

    /**
     * Amount of token A (raw BN, before decimals)
     */
    amountA: BN

    /**
     * Amount of token B (raw BN, before decimals)
     */
    amountB: BN

    /**
     * Fixed-point precision used for sqrt prices
     * Q64 (Solana), Q96 (Ethereum), Q128 (extended)
     */
    fixedPointScale?: typeof Q64 | typeof Q96 | typeof Q128
}