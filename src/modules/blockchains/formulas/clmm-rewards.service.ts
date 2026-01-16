import { Injectable } from "@nestjs/common"
import { BN, Decimal } from "turbos-clmm-sdk"
import { Q128, Q64 } from "@utils"
import { ClmmUtilsService } from "./clmm-utils.service"

/**
 * CLMM Reward Formula Service
 *
 * Implements Uniswap V3-style “reward/points growth” math for positions.
 *
 * Core formula (generalized):
 *   deltaGrowth = (growthInsideNow - growthInsideLast) mod insideDeltaWrapModulus
 *   rewardDelta = (liquidity × deltaGrowth) / resultDiv
 *
 * Defaults:
 *  - insideDeltaWrapModulus = Q128 (u128 wrapping)
 *  - resultDiv = Q64 (Q64 fixed-point; >> 64)
 */
@Injectable()
export class ClmmRewardsFormulaService {
    constructor(
        private readonly clmmUtilsService: ClmmUtilsService,
    ) {}

    /**
     * Compute reward growth inside a position range
     *
     * Formula (Uniswap V3 style):
     *
     * if current < lower:
     *   inside = outsideLower - outsideUpper
     *
     * if current >= upper:
     *   inside = outsideUpper - outsideLower
     *
     * else:
     *   inside = global - outsideLower - outsideUpper
     *
     * Wrapping:
     *  - Many CLMM implementations use wrapping u128 arithmetic
     */
    public computeRewardGrowthInside(
        {
            rewardGrowthGlobal,
            rewardGrowthOutsideLower,
            rewardGrowthOutsideUpper,
            currentTick,
            tickLower,
            tickUpper,
            outsideDeltaWrapModulus = Q128,
        }: ComputeRewardGrowthInsideParams
    ): BN {

        // current < lower
        if (currentTick.lessThan(tickLower)) {
            return this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideLower,
                rewardGrowthOutsideUpper,
                outsideDeltaWrapModulus,
            )
        }

        // current >= upper
        if (currentTick.greaterThanOrEqualTo(tickUpper)) {
            return this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideUpper,
                rewardGrowthOutsideLower,
                outsideDeltaWrapModulus,
            )
        }

        // inside range:
        // global - (outsideLower - outsideUpper)
        return this.clmmUtilsService.wrapSub(
            rewardGrowthGlobal,
            this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideLower,
                rewardGrowthOutsideUpper,
                outsideDeltaWrapModulus,
            ),
            outsideDeltaWrapModulus,
        )
    }

    /**
     * Compute reward earned since last checkpoint
     *
     * Generalized fixed-point formula:
     *   deltaGrowth = (rewardGrowthInside - rewardGrowthInsideLast) mod insideDeltaWrapModulus
     *   rewardDelta = (liquidity × deltaGrowth) / resultDiv
     */
    public computeRewardEarned(
        {
            rewardGrowthInside,
            rewardGrowthInsideLast,
            liquidity,
            insideDeltaWrapModulus = Q128,
            resultDiv = Q64,
        }: ComputeRewardEarnedParams
    ): BN {

        // wrapping delta growth (typically u128)
        const deltaGrowth = this.clmmUtilsService.wrapSub(
            rewardGrowthInside,
            rewardGrowthInsideLast,
            insideDeltaWrapModulus,
        )

        // liquidity * deltaGrowth / resultDiv
        return liquidity.mul(deltaGrowth).div(resultDiv)
    }

    /**
     * Compute total reward for a position
     *
     * Flow:
     *  1. Compute reward growth inside range
     *  2. Compute reward earned since last checkpoint
     *  3. Add already owned reward
     */
    public computeTotalReward(
        {
            rewardGrowthGlobal,
            rewardGrowthOutsideLower,
            rewardGrowthOutsideUpper,
            currentTick,
            tickLower,
            tickUpper,

            rewardGrowthInsideLast,
            liquidity,
            rewardOwned = new BN(0),

            outsideDeltaWrapModulus = Q128,
            insideDeltaWrapModulus = Q128,
            resultDiv = Q64,
        }: ComputeTotalRewardParams
    ): BN {

        // Step 1: reward growth inside range
        const rewardGrowthInside = this.computeRewardGrowthInside({
            rewardGrowthGlobal,
            rewardGrowthOutsideLower,
            rewardGrowthOutsideUpper,
            currentTick,
            tickLower,
            tickUpper,
            outsideDeltaWrapModulus,
        })

        // Step 2: reward earned since last checkpoint
        const rewardEarned = this.computeRewardEarned({
            rewardGrowthInside,
            rewardGrowthInsideLast,
            liquidity,
            insideDeltaWrapModulus,
            resultDiv,
        })

        // Step 3: add already owned reward
        return rewardOwned.add(rewardEarned)
    }
}

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface ComputeRewardGrowthInsideParams {
    rewardGrowthGlobal: BN
    rewardGrowthOutsideLower: BN
    rewardGrowthOutsideUpper: BN
    currentTick: Decimal
    tickLower: Decimal
    tickUpper: Decimal

    /**
     * Wrapping modulus for outside delta calculation
     * Default: Q128 (u128 wrapping)
     */
    outsideDeltaWrapModulus?: typeof Q128 | typeof Q64
}

export interface ComputeRewardEarnedParams {
    rewardGrowthInside: BN
    rewardGrowthInsideLast: BN
    liquidity: BN

    /**
     * Wrapping modulus for inside delta growth
     * Default: Q128
     */
    insideDeltaWrapModulus?: typeof Q128 | typeof Q64

    /**
     * Divisor for final reward calculation
     * Commonly Q64 (>> 64)
     */
    resultDiv?: typeof Q64 | typeof Q128
}

export interface ComputeTotalRewardParams {
    rewardGrowthGlobal: BN
    rewardGrowthOutsideLower: BN
    rewardGrowthOutsideUpper: BN
    currentTick: Decimal
    tickLower: Decimal
    tickUpper: Decimal
    rewardGrowthInsideLast: BN
    liquidity: BN
    rewardOwned?: BN

    /**
     * Wrapping modulus for outside growth delta
     */
    outsideDeltaWrapModulus?: typeof Q128 | typeof Q64

    /**
     * Wrapping modulus for inside growth delta
     */
    insideDeltaWrapModulus?: typeof Q128 | typeof Q64

    /**
     * Divisor for reward result
     */
    resultDiv?: typeof Q64 | typeof Q128
}