import {
    MarketListingId,
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
    lastUpdateTimeMs?: BN
}

export interface DynamicClmmLiquidityPoolInfoCacheResult extends SnapshotCacheResult {
    tickCurrent: BN
    liquidity: BN
    sqrtPriceX64: BN
    rewards: Array<DynamicClmmRewardInfo>
    feeGrowthGlobalA: BN
    feeGrowthGlobalB: BN
    rewardLastUpdatedTimeMs?: BN
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
    activeId: BN
    rewards: Array<DynamicDlmmRewardInfo>
}

export interface PoolAnalyticsCacheResult extends SnapshotCacheResult {
    fee24H: string
    volume24H: string
    tvl: string
    apr24H: string
    liquidity: string
}

export type SessionIdCacheResult = boolean

export type DynamicLiquidityPoolInfoCacheResult = DynamicClmmLiquidityPoolInfoCacheResult | DynamicDlmmLiquidityPoolInfoCacheResult

export type LiquidityPoolSyncedDiagnosticReadinessResult = SnapshotCacheResult
export interface LiquidityPoolsSyncedDiagnosticReadinessResult extends SnapshotCacheResult {
    results: Partial<Record<string, LiquidityPoolSyncedDiagnosticReadinessResult>>
}

export interface SendOtpCodeCacheResult {
    otp: string
}

export interface WithdrawCacheTokenInput {
    tokenId: string
    amount: BN
}

export interface WithdrawCacheResult {
    tokenInputs: Array<WithdrawCacheTokenInput>
    toUsdc?: boolean
}