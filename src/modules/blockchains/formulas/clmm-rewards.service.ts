import {
    Injectable,
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    Q128,
    Q64,
    toDecimalAmount,
} from "@modules/common"
import {
    ClmmUtilsService,
} from "./clmm-utils.service"
import {
    ComputeRewardGrowthInsideParams,
    ComputeRewardParams
} from "./types"

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
     * Computes reward growth inside a position range.
     *
     * @param param - Parameters for computing reward growth inside
     * @returns Reward growth inside the position range
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
        // Case: current price is below the position range
        if (tickCurrent.lt(tickLower)) {
            return this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideLower,
                rewardGrowthOutsideUpper,
                wrapModulus,
            )
        }
        // Case: current price is above the position range
        if (tickCurrent.gte(tickUpper)) {
            return this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideUpper,
                rewardGrowthOutsideLower,
                wrapModulus,
            )
        }
        // Case: current price is inside the position range
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
     * Computes reward for a position (time-based emissions).
     *
     * @param param - Parameters for computing reward
     * @returns Reward amount in decimal format
     */
    public computeRewardTurbos({
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
        // Step 1: Update rewardGrowthGlobal from last update to now
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

        // Step 2: Compute reward growth inside range
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

        // Step 3: Compute delta growth (wrapping-safe), then rewardDelta = liquidity × deltaGrowth / Q64
        const deltaGrowthInside = this.clmmUtilsService.wrapSub(
            growthInsideNow,
            rewardGrowthInsideLast,
            insideDeltaWrapModulus,
        )
        const rewardDelta = liquidity.mul(deltaGrowthInside).div(resultDiv)

        // Step 4: Add already owned reward and convert to decimal
        return toDecimalAmount({
            amount: rewardOwned.add(rewardDelta),
            decimals,
        })
    }

    /**
     * Cetus-style reward computation:
     * - rewardGrowthGlobal đã được update ở ngoài (pool)
     * - chỉ tính growthInside và rewardDelta
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
        wrapModulus = Q128,
        resultDiv = Q64,
        decimals,
    }: ComputeRewardParams): Decimal {

        // Step 1: compute growthInsideNow (giống Cetus)
        let growthInsideNow: BN

        if (tickCurrent.lt(tickLower)) {
            growthInsideNow = this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideLower,
                rewardGrowthOutsideUpper,
                wrapModulus,
            )
        } else if (tickCurrent.gte(tickUpper)) {
            growthInsideNow = this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideUpper,
                rewardGrowthOutsideLower,
                wrapModulus,
            )
        } else {
            growthInsideNow = this.clmmUtilsService.wrapSub(
                this.clmmUtilsService.wrapSub(
                    rewardGrowthGlobal,
                    rewardGrowthOutsideLower,
                    wrapModulus,
                ),
                rewardGrowthOutsideUpper,
                wrapModulus,
            )
        }
        // Step 2: delta growth (wrapping)
        const deltaGrowthInside = this.clmmUtilsService.wrapSub(
            growthInsideNow,
            rewardGrowthInsideLast,
            wrapModulus,
        )
        const rewardDelta = liquidity.mul(deltaGrowthInside).div(resultDiv)
        return toDecimalAmount({
            amount: rewardOwned.add(rewardDelta),
            decimals,
        })
    }

    /**
     * Computes reward for a position (time-based emissions) for Raydium.
     *
     * @param param - Parameters for computing reward
     * @returns Reward amount in decimal format
     */
    public computeRewardRaydium({
        rewardGrowthGlobal,         // reward_growth_global_x64 (u128)
        rewardGrowthOutsideLower,   // reward_growth_outside_lower_x64 (u128)
        rewardGrowthOutsideUpper,   // reward_growth_outside_upper_x64 (u128)
        tickCurrent,
        tickLower,
        tickUpper,
        rewardGrowthInsideLast,     // reward_growth_inside_last_x64 (u128)
        liquidity,                  // position liquidity
        rewardOwned = new BN(0),    // reward already owned (raw integer)
        emissionsPerSecond,         // emissions_per_second_x64
        lastUpdateMs,              // last_update_time (SECONDS)
        totalLiquidity,             // pool liquidity
        decimals,
    }: ComputeRewardParams): Decimal {
        
        const nowSec = new BN(Math.floor(Date.now() / 1000))
      
        let global = rewardGrowthGlobal
      
        // ===== 1. update rewardGrowthGlobal like on-chain =====
        if (nowSec.gt(lastUpdateMs) && !totalLiquidity.isZero()) {
            const dt = nowSec.sub(lastUpdateMs)
      
            const increment = dt
                .mul(emissionsPerSecond) // emissions_per_second_x64
                .div(totalLiquidity)
            // Raydium uses u128 wrap
            global = this.clmmUtilsService.wrapAdd(
                global,
                increment,
                Q128, // wrap modulus = 2^128
            )
            console.log({
                global: global.toString(),
                increment: increment.toString(),
            })
        }
      
        // ===== 2. compute growthInsideNow =====
        let growthInsideNow: BN
      
        if (tickCurrent.lt(tickLower)) {
            growthInsideNow = this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideLower,
                rewardGrowthOutsideUpper,
                Q128,
            )
        } else if (tickCurrent.gte(tickUpper)) {
            growthInsideNow = this.clmmUtilsService.wrapSub(
                rewardGrowthOutsideUpper,
                rewardGrowthOutsideLower,
                Q128,
            )
        } else {
            growthInsideNow = this.clmmUtilsService.wrapSub(
                this.clmmUtilsService.wrapSub(
                    global,
                    rewardGrowthOutsideLower,
                    Q128,
                ),
                rewardGrowthOutsideUpper,
                Q128,
            )
        }
      
        // ===== 3. deltaGrowthInside =====
        const deltaGrowthInside = this.clmmUtilsService.wrapSub(
            growthInsideNow,
            rewardGrowthInsideLast,
            Q128,
        )
      
        // ===== 4. rewardDelta = liquidity * deltaGrowth / Q64 =====
        const rewardDelta = liquidity
            .mul(deltaGrowthInside)
            .div(Q64) // IMPORTANT: divide by Q64, NOT Q128
      
        // ===== 5. total reward =====
        return toDecimalAmount({
            amount: rewardOwned.add(rewardDelta),
            decimals,
        })
    }
}
