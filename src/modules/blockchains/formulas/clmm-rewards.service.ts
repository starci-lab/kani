import {
    Injectable,
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    Q128,
    Q64,
    Q96,
    toDecimalAmount,
} from "@modules/utils"
import {
    ClmmUtilsService,
} from "./clmm-utils.service"

/**
 * CLMM Rewards Service (Uniswap V3 style)
 *
 * Implements time-based reward growth for CLMM pools:
 *
 * Pool:
 *   rewardGrowthGlobal += Δt * emissionsPerSecond * Q64 / totalLiquidity
 *
 * Position:
 *   deltaGrowthInside = (growthInsideNow - growthInsideLast) mod wrapModulus
 *   rewardDelta = (liquidity × deltaGrowthInside) / Q64
 *
 * Defaults:
 *  - wrapModulus = Q128 (u128 wrapping)
 *  - resultDiv = Q64
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
     *  - Uses wrapping u128 arithmetic (wrapModulus, default Q128)
     */
    public computeRewardGrowthInside({
        rewardGrowthGlobal,
        rewardGrowthOutsideLower,
        rewardGrowthOutsideUpper,
        tickCurrent,
        tickLower,
        tickUpper,
        wrapModulus = Q128,
    }: ComputeRewardGrowthInsideParams): BN {
        // current < lower
        if (tickCurrent.lt(tickLower)) {
            return this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideLower,
                rewardGrowthOutsideUpper,
                wrapModulus,
            )
        }
        // current >= upper
        if (tickCurrent.gte(tickUpper)) {
            return this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideUpper,
                rewardGrowthOutsideLower,
                wrapModulus,
            )
        }
        // inside range: (global - outsideLower) - outsideUpper
        return this.clmmUtilsService.wrapSub(
            this.clmmUtilsService.wrapSub(
                rewardGrowthGlobal,
                rewardGrowthOutsideLower,
                wrapModulus,
            ),
            rewardGrowthOutsideUpper,
            wrapModulus,
        )
    }

    /**
     * Compute reward for a position (time-based emissions)
     *
     * Flow:
     *  1. Update rewardGrowthGlobal from last update to now (Δt * emissionsPerSecond / totalLiquidity)
     *  2. Compute reward growth inside range
     *  3. Compute delta growth (wrapping-safe), then rewardDelta = liquidity × deltaGrowth / Q64
     *  4. Add already owned reward and convert to decimal
     */
    public computeReward({
        rewardGrowthGlobal,
        rewardGrowthOutsideLower,
        rewardGrowthOutsideUpper,
        tickCurrent,
        tickLower,
        tickUpper,
        rewardGrowthInsideLast,
        liquidity,
        rewardOwned = new BN(0),
        emissionsPerSecond,
        lastUpdateMs,
        totalLiquidity,
        outsideDeltaWrapModulus = Q128,
        insideDeltaWrapModulus = Q128,
        resultDiv = Q64,
        decimals,
    }: ComputeRewardParams): Decimal {
        // Step 1: update rewardGrowthGlobal (Δt * emissionsPerSecond / totalLiquidity)
        const nowMs = new BN(Date.now())
        if (!nowMs.lte(lastUpdateMs) && !totalLiquidity.isZero()) {
            const deltaT = nowMs.sub(lastUpdateMs).div(new BN(1000))
            if (!deltaT.isZero()) {
                const increment = deltaT
                    .mul(emissionsPerSecond)
                    .div(totalLiquidity)
                rewardGrowthGlobal = this.clmmUtilsService.wrapAdd(
                    rewardGrowthGlobal,
                    increment,
                    outsideDeltaWrapModulus,
                )
            }
        }

        // Step 2: reward growth inside range
        let growthInsideNow: BN
        if (tickCurrent.lt(tickLower)) {
            growthInsideNow = this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideLower,
                rewardGrowthOutsideUpper,
                outsideDeltaWrapModulus,
            )
        } else if (tickCurrent.gte(tickUpper)) {
            growthInsideNow = this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideUpper,
                rewardGrowthOutsideLower,
                outsideDeltaWrapModulus,
            )
        } else {
            growthInsideNow = this.clmmUtilsService.wrapSub(
                this.clmmUtilsService.wrapSub(
                    rewardGrowthGlobal,
                    rewardGrowthOutsideLower,
                    outsideDeltaWrapModulus,
                ),
                rewardGrowthOutsideUpper,
                outsideDeltaWrapModulus,
            )
        }
        // Step 3: wrapping delta growth, then rewardDelta = liquidity × deltaGrowth / Q64
        const deltaGrowthInside = this.clmmUtilsService.wrapSub(
            growthInsideNow,
            rewardGrowthInsideLast,
            insideDeltaWrapModulus,
        )
        const rewardDelta = liquidity.mul(deltaGrowthInside).div(resultDiv)

        // Step 4: add already owned reward and convert to decimal
        return toDecimalAmount({
            amount: rewardOwned.add(rewardDelta),
            decimals,
        })
    }
}

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface ComputeNextTimeBasedRewardGrowthGlobalParams {
    nowMs: BN
    lastUpdateMs: BN
    rewardGrowthGlobalLast: BN
    /** raw tokens per second */
    emissionsPerSecond: BN
    /** total pool liquidity */
    totalLiquidity: BN
  }
  
export interface ComputeRewardGrowthInsideParams {
    rewardGrowthGlobal: BN
    rewardGrowthOutsideLower: BN
    rewardGrowthOutsideUpper: BN
    tickCurrent: BN
    tickLower: BN
    tickUpper: BN
    wrapModulus?: typeof Q128 | typeof Q64
  }
  
export interface ComputeRewardParams {
    /**
     * Reward growth global
     */
    rewardGrowthGlobal: BN
    /**
     * Reward growth outside lower
     */
    rewardGrowthOutsideLower: BN
    /**
     * Reward growth outside upper
     */
    rewardGrowthOutsideUpper: BN
    /**
     * Tick current
     */
    tickCurrent: BN
    /**
     * Tick lower
     */
    tickLower: BN
    /**
     * Tick upper
     */
    tickUpper: BN
    /**
     * Reward growth inside last
     */
    rewardGrowthInsideLast: BN
    /**
     * Liquidity
     */
    liquidity: BN
    /**
     * Reward owned
     */
    rewardOwned?: BN
    /**
     * Decimals
     */
    decimals: Decimal
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
    resultDiv?: typeof Q64 | typeof Q96 | typeof Q128
    /**
     * Emissions per second
     */
    emissionsPerSecond: BN
    /**
     * Last update timestamp
     */
    lastUpdateMs: BN
    /** total pool liquidity */
    totalLiquidity: BN
  }