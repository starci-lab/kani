import type {
    MarketListingId 
} from "@modules/databases"
import type {
    Dayjs 
} from "dayjs"
import type BN from "bn.js"

/** Base cache result with snapshot timestamp. */
export interface SnapshotCacheResult {
    snapshotAt: Dayjs
}

/** Single market aggregated token price entry. */
export interface AggregatedTokenPriceCache extends SnapshotCacheResult {
    price: number
}

/** Aggregated token price cache result (prices by market listing). */
export interface AggregatedTokenPriceCacheResult extends SnapshotCacheResult {
    prices: Partial<Record<MarketListingId, AggregatedTokenPriceCache>>
}

/** CLMM reward info for dynamic pool cache. */
export interface DynamicClmmRewardInfo {
    tokenAddress: string
    emissionPerSecond: BN
    growthGlobal: BN
    vaultAddress?: string
    lastUpdateTimeMs?: BN
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

/** Pool analytics cache result. */
export interface PoolAnalyticsCacheResult extends SnapshotCacheResult {
    fee24H: string
    volume24H: string
    tvl: string
    apr24H: string
    liquidity: string
}

/** Session ID cache result (boolean). */
export type SessionIdCacheResult = boolean

/** Union of CLMM or DLMM dynamic pool info cache result. */
export type DynamicLiquidityPoolInfoCacheResult =
    | DynamicClmmLiquidityPoolInfoCacheResult
    | DynamicDlmmLiquidityPoolInfoCacheResult

/** Single liquidity pool synced diagnostic readiness. */
export type LiquidityPoolSyncedDiagnosticReadinessResult = SnapshotCacheResult

/** Liquidity pools synced diagnostic readiness cache result. */
export interface LiquidityPoolsSyncedDiagnosticReadinessResult extends SnapshotCacheResult {
    results: Partial<Record<string, LiquidityPoolSyncedDiagnosticReadinessResult>>
}

/** Send OTP code cache result. */
export interface SendOtpCodeCacheResult {
    otp: string
}

/** Single token input in withdraw cache. */
export interface WithdrawCacheTokenInput {
    tokenId: string
    amount: BN
}

/** Withdraw cache result. */
export interface WithdrawCacheResult {
    tokenInputs: Array<WithdrawCacheTokenInput>
    toUsdc?: boolean
}
