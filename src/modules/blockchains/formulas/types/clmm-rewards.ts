import BN from "bn.js"
import Decimal from "decimal.js"
import {
    Q128,
    Q64,
    Q96
} from "@modules/utils"

/**
 * Parameters for computing next time-based reward growth global.
 */
export interface ComputeNextTimeBasedRewardGrowthGlobalParams {
    nowMs: BN
    lastUpdateMs: BN
    rewardGrowthGlobalLast: BN
    /** raw tokens per second */
    emissionsPerSecond: BN
    /** total pool liquidity */
    totalLiquidity: BN
}

/**
 * Parameters for computing reward growth inside a position range.
 */
export interface ComputeRewardGrowthInsideParams {
    rewardGrowthGlobal: BN
    rewardGrowthOutsideLower: BN
    rewardGrowthOutsideUpper: BN
    tickCurrent: BN
    tickLower: BN
    tickUpper: BN
    wrapModulus?: typeof Q128 | typeof Q64
}

/**
 * Parameters for computing reward for a position (time-based emissions).
 */
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
