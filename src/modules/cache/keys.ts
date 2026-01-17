import { MarketId } from "@modules/databases"
import { ChainId } from "@typedefs"
import BN from "bn.js"
import { Dayjs } from "dayjs"

export enum CacheKey {
    SealedAesKey = "sealedAesKey",
    SealedJwtSecretKey = "sealedJwtSecretKey",
    EjectRpcs = "ejectRpcs",
    History = "history",
    HistoryNeedRevalidated = "historyNeedRevalidated",
    OpenPositionTransaction = "openPositionTransaction",
    ClosePositionTransaction = "closePositionTransaction",
    WsCexLastPrice = "wsCexLastPrice",
    WsCexOrderBook = "wsCexOrderBook",
    DynamicClmmLiquidityPoolInfo = "dynamicClmmLiquidityPoolInfo",
    DynamicDlmmLiquidityPoolInfo = "dynamicDlmmLiquidityPoolInfo",
    CoinMarketCapPrices = "coinMarketCapPrices",
    CoinGeckoPrices = "coinGeckoPrices",
    LiquidityPools = "liquidityPools",
    TokenPriceData = "tokenPriceData",
    BinanceWsOrderBook = "binanceWsOrderBook",
    OraclePrices = "oraclePrices",
    AggregatedTokenPrice = "aggregatedTokenPrice",
    User = "user",
    UserIds = "userIds",
    SessionId = "sessionId",
    PoolAnalytics = "poolAnalytics",
    SignInOtpCode = "signInOtpCode",
    SendOtpCode = "sendOtpCode",
    SpotPrice = "spotPrice",
    FeesResponse = "feesResponse",
}

export interface NonExpiredCacheResult {
    snapshotAt: Dayjs
}

export interface SpotPriceCacheResult {
    price: number
}


export interface AggregatedTokenPriceCache extends NonExpiredCacheResult {
    price: number
    snapshotAt: Dayjs
}

export interface AggregatedTokenPriceCacheResult extends NonExpiredCacheResult {
    prices: Partial<Record<MarketId, AggregatedTokenPriceCache>>
}

export interface ClmmRewardInfo {
    tokenAddress: string
    emissionPerSecond: BN
    growthGlobal: BN
}

export interface DynamicClmmLiquidityPoolInfoCacheResult extends NonExpiredCacheResult {
    tickCurrent: BN
    liquidity: BN
    sqrtPriceX64: BN
    rewards: Array<ClmmRewardInfo>
    feeGrowthGlobalA: BN
    feeGrowthGlobalB: BN
}

// ["mint", publicKey],
// ["vault", publicKey],
// ["funder", publicKey],
// ["reward_duration", u64],
// ["reward_duration_end", u64],
// ["reward_rate", u128],
// ["last_update_time", u64],
// ["cumulative_seconds_with_empty_liquidity_reward", u64],
export interface DlmmRewardInfo {
    tokenAddress: string
    vault: string
    funder: string
    rewardDuration: BN
    rewardDurationEnd: BN
    rewardRate: BN
    lastUpdateTime: BN
    cumulativeSecondsWithEmptyLiquidityReward: BN
}

export interface DynamicDlmmLiquidityPoolInfoCacheResult extends NonExpiredCacheResult {
    activeId: number
    rewards: Array<DlmmRewardInfo>
}

export interface PoolAnalyticsCacheResult {
    fee24H: string
    volume24H: string
    tvl: string
    apr24H: string
}

export interface SignInOtpCacheResult {
    otp: string
}

export interface SendOtpCacheResult {
    otp: string
}

export type EjectedRpcsCacheResult = Partial<Record<ChainId, Array<string>>>