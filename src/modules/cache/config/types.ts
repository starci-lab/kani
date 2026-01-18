import {
    MarketListingId
} from "@modules/databases"
import {
    Dayjs
} from "dayjs"
import BN from "bn.js"

export interface SnapshotCacheResult {
    snapshotAt: Dayjs
}

export interface AggregatedTokenPriceCache extends SnapshotCacheResult {
    price: number
}

export interface AggregatedTokenPriceCacheResult extends SnapshotCacheResult {
    prices: Partial<Record<MarketListingId, AggregatedTokenPriceCache>>
}

export interface DynamicClmmRewardInfo {
    tokenAddress: string
    emissionPerSecond: BN
    growthGlobal: BN
    vaultAddress?: string
}

export interface DynamicClmmLiquidityPoolInfoCacheResult extends SnapshotCacheResult {
    tickCurrent: BN
    liquidity: BN
    sqrtPriceX64: BN
    rewards: Array<DynamicClmmRewardInfo>
    feeGrowthGlobalA: BN
    feeGrowthGlobalB: BN
}

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

export interface DynamicDlmmLiquidityPoolInfoCacheResult extends SnapshotCacheResult {
    activeId: number
    rewards: Array<DynamicDlmmRewardInfo>
}

export interface PoolAnalyticsCacheResult extends SnapshotCacheResult {
    fee24H: string
    volume24H: string
    tvl: string
    apr24H: string
}