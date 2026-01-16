import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import { Q128, Q64 } from "@utils"
import { ClmmUtilsService } from "./clmm-utils.service"

/**
 * Cetus / UniswapV3-style CLMM Fee Formula Service
 *
 * Mirrors on-chain fee math for positions:
 *
 * - feeGrowthInside is computed with u128 wrapping arithmetic
 * - feeEarned is computed from:
 *    deltaGrowth = (growthInsideNow - growthInsideLast) mod 2^128
 *    feeDelta = (liquidity × deltaGrowth) / 2^64
 */
@Injectable()
export class ClmmFeesFormulaService {
    constructor(
        private readonly clmmUtilsService: ClmmUtilsService,
    ) {}

    /**
     * Compute fee growth inside a position tick range.
     *
     * Uniswap V3 style:
     *  if current < lower:
     *    inside = outsideLower - outsideUpper
     *  else if current >= upper:
     *    inside = outsideUpper - outsideLower
     *  else:
     *    inside = global - outsideLower - outsideUpper
     *
     * Cetus uses wrapping u128 arithmetic for these deltas.
     */
    public computeFeeGrowthInside(
        {
            feeGrowthGlobal,
            feeGrowthOutsideLower,
            feeGrowthOutsideUpper,
            currentTick,
            tickLower,
            tickUpper,
            outsideDeltaWrapModulus = Q128,
        }: ComputeFeeGrowthInsideParams
    ): BN {

        // current < lower
        if (currentTick.lessThan(tickLower)) {
            return this.clmmUtilsService.wrapSub(
                feeGrowthOutsideLower,
                feeGrowthOutsideUpper,
                outsideDeltaWrapModulus,
            )
        }

        // current >= upper
        if (currentTick.greaterThanOrEqualTo(tickUpper)) {
            return this.clmmUtilsService.wrapSub(
                feeGrowthOutsideUpper,
                feeGrowthOutsideLower,
                outsideDeltaWrapModulus,
            )
        }

        // inside range:
        // global - outsideLower - outsideUpper  (wrapped)
        return this.clmmUtilsService.wrapSub(
            this.clmmUtilsService.wrapSub(
                feeGrowthGlobal,
                feeGrowthOutsideLower,
                outsideDeltaWrapModulus,
            ),
            feeGrowthOutsideUpper,
            outsideDeltaWrapModulus,
        )
    }

    /**
     * Compute fee earned since last position checkpoint.
     *
     * On-chain:
     *  deltaGrowth = (growthInsideNow - growthInsideLast) mod 2^128
     *  feeDelta = (liquidity × deltaGrowth) / 2^64
     */
    public computeFeeEarned(
        {
            feeGrowthInside,
            feeGrowthInsideLast,
            liquidity,
            insideDeltaWrapModulus = Q128,
            resultDiv = Q64,
        }: ComputeFeeEarnedParams
    ): BN {
        const deltaGrowth = this.clmmUtilsService.wrapSub(
            feeGrowthInside,
            feeGrowthInsideLast,
            insideDeltaWrapModulus,
        )

        return liquidity.mul(deltaGrowth).div(resultDiv)
    }

    /**
     * Compute total fees for a position:
     *  feesOwned + feesEarnedSinceCheckpoint
     */
    public computeTotalFees(
        {
            feeGrowthGlobal,
            feeGrowthOutsideLower,
            feeGrowthOutsideUpper,
            currentTick,
            tickLower,
            tickUpper,

            feeGrowthInsideLast,
            liquidity,
            feeOwned = new BN(0),

            outsideDeltaWrapModulus = Q128,
            insideDeltaWrapModulus = Q128,
            resultDiv = Q64,
        }: ComputeTotalFeesParams
    ): BN {

        const feeGrowthInside = this.computeFeeGrowthInside({
            feeGrowthGlobal,
            feeGrowthOutsideLower,
            feeGrowthOutsideUpper,
            currentTick,
            tickLower,
            tickUpper,
            outsideDeltaWrapModulus,
        })

        const feeEarned = this.computeFeeEarned({
            feeGrowthInside,
            feeGrowthInsideLast,
            liquidity,
            insideDeltaWrapModulus,
            resultDiv,
        })

        return feeOwned.add(feeEarned)
    }
}

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface ComputeFeeGrowthInsideParams {
    feeGrowthGlobal: BN
    feeGrowthOutsideLower: BN
    feeGrowthOutsideUpper: BN
    currentTick: Decimal
    tickLower: Decimal
    tickUpper: Decimal

    /**
     * Wrapping modulus for inside calculation (default: Q128)
     */
    outsideDeltaWrapModulus?: typeof Q128 | typeof Q64
}

export interface ComputeFeeEarnedParams {
    feeGrowthInside: BN
    feeGrowthInsideLast: BN
    liquidity: BN

    /**
     * Wrapping modulus for delta growth (default: Q128)
     */
    insideDeltaWrapModulus?: typeof Q128 | typeof Q64

    /**
     * Divisor for final fee result (default: Q64)
     */
    resultDiv?: typeof Q64 | typeof Q128
}

export interface ComputeTotalFeesParams {
    feeGrowthGlobal: BN
    feeGrowthOutsideLower: BN
    feeGrowthOutsideUpper: BN
    currentTick: Decimal
    tickLower: Decimal
    tickUpper: Decimal

    feeGrowthInsideLast: BN
    liquidity: BN
    feeOwned?: BN

    outsideDeltaWrapModulus?: typeof Q128 | typeof Q64
    insideDeltaWrapModulus?: typeof Q128 | typeof Q64
    resultDiv?: typeof Q64 | typeof Q128
}

