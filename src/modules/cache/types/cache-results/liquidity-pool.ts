import type BN from "bn.js"
import type {
    SnapshotCacheResult,
} from "./base"

/** CLMM reward info for dynamic pool cache. */
export interface DynamicClmmRewardInfo {
    tokenAddress: string
    emissionPerSecond: BN
    growthGlobal: BN
    vaultAddress?: string
    lastUpdateTimeMs?: BN
    expired?: boolean
}

/** Dynamic CLMM liquidity pool info cache result. */
export interface DynamicClmmLiquidityPoolInfoCacheResult extends SnapshotCacheResult {
    tickCurrent: BN
    liquidity: BN
    sqrtPriceX64: BN
    rewards: Array<DynamicClmmRewardInfo>
    feeGrowthGlobalA: BN
    feeGrowthGlobalB: BN
    rewardLastUpdatedTimeMs?: BN
}

/** DLMM reward info for dynamic pool cache. */
export interface DynamicDlmmRewardInfo {
    tokenAddress: string
    vault: string
    funder: string
    rewardDuration: BN
    rewardDurationEnd: BN
    rewardRate: BN
    lastUpdateTime: BN
    cumulativeSecondsWithEmptyLiquidityReward: BN
}

/** Dynamic DLMM liquidity pool info cache result. */
export interface DynamicDlmmLiquidityPoolInfoCacheResult extends SnapshotCacheResult {
    activeId: BN
    rewards: Array<DynamicDlmmRewardInfo>
}

/** APR breakdown for pool analytics. */
export interface AprBreakdown {
    fees: string
    rewards: string
    total: string
}

/** Pool analytics cache result. */
export interface PoolAnalyticsCacheResult extends SnapshotCacheResult {
    fee24H: string
    volume24H: string
    tvl: string
    apr24H: AprBreakdown
    liquidity: string
}

/** Union of CLMM or DLMM dynamic pool info cache result. */
export type DynamicLiquidityPoolInfoCacheResult =
    | DynamicClmmLiquidityPoolInfoCacheResult
    | DynamicDlmmLiquidityPoolInfoCacheResult
