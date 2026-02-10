import type {
    CacheKey,
    CacheType,
} from "../enums"
import type {
    AggregatedTokenPriceCacheResult,
    DynamicClmmLiquidityPoolInfoCacheResult,
    DynamicDlmmLiquidityPoolInfoCacheResult,
    LiquidityPoolsSyncedDiagnosticReadinessCacheResult,
    PoolAnalyticsCacheResult,
    RotationBotAssignmentsCacheResult,
    SendOtpCodeCacheResult,
    SessionIdCacheResult,
    WithdrawCacheResult,
} from "./cache-results"

/** Maps each cache key to its cache result type. */
export interface CacheResultByKey {
    [CacheKey.Withdraw]: WithdrawCacheResult
    [CacheKey.SendOtpCode]: SendOtpCodeCacheResult
    [CacheKey.AggregatedTokenPrice]: AggregatedTokenPriceCacheResult
    [CacheKey.DynamicClmmLiquidityPoolInfo]: DynamicClmmLiquidityPoolInfoCacheResult
    [CacheKey.DynamicDlmmLiquidityPoolInfo]: DynamicDlmmLiquidityPoolInfoCacheResult
    [CacheKey.PoolAnalytics]: PoolAnalyticsCacheResult
    [CacheKey.SessionId]: SessionIdCacheResult
    [CacheKey.LiquidityPoolsSyncedDiagnosticReadiness]: LiquidityPoolsSyncedDiagnosticReadinessCacheResult
    [CacheKey.RotationBotAssignments]: RotationBotAssignmentsCacheResult
}

/** Params for cache get (key, optional args, cache type). */
export interface GetParams<K extends CacheKey> {
    key: K
    args?: Array<unknown>
    cacheType?: CacheType
}

/** Params for cache set (key, args, cache result, cache type). */
export interface SetParams<K extends CacheKey> {
    key: K
    args?: Array<unknown>
    cacheResult: CacheResultByKey[K]
    cacheType?: CacheType
}

/** Params for cache delete (key, optional args, cache type). */
export interface DelParams {
    key: CacheKey
    args?: Array<unknown>
    cacheType?: CacheType
}
