import {
    envConfig 
} from "@modules/env"
import {
    CacheKey
} from "./enum"
import {
    WithdrawCacheResult,
    AggregatedTokenPriceCacheResult,
    DynamicClmmLiquidityPoolInfoCacheResult, 
    DynamicDlmmLiquidityPoolInfoCacheResult, 
    LiquidityPoolsSyncedDiagnosticReadinessResult, 
    PoolAnalyticsCacheResult,
    SessionIdCacheResult,
    SendOtpCodeCacheResult
} from "./types"

export const configMap = {
    [CacheKey.Withdraw]: {
        ttl: envConfig().cache.ttl.withdraw,
        cacheResult: {
            tokenInputs: [],
        } as WithdrawCacheResult
    },
    [CacheKey.AggregatedTokenPrice]: {
        ttl: envConfig().cache.ttl.aggregatedTokenPrice,
        cacheResult: {    
        } as AggregatedTokenPriceCacheResult
    },
    [CacheKey.DynamicClmmLiquidityPoolInfo]: {
        ttl: envConfig().cache.ttl.dynamicClmmLiquidityPoolInfo,
        cacheResult: {    
        } as DynamicClmmLiquidityPoolInfoCacheResult
    },
    [CacheKey.DynamicDlmmLiquidityPoolInfo]: {
        ttl: envConfig().cache.ttl.dynamicDlmmLiquidityPoolInfo,
        cacheResult: {    
        } as DynamicDlmmLiquidityPoolInfoCacheResult
    },
    [CacheKey.PoolAnalytics]: {
        ttl: envConfig().cache.ttl.poolAnalytics,
        cacheResult: {    
        } as PoolAnalyticsCacheResult
    },
    [CacheKey.SessionId]: {
        ttl: envConfig().cache.ttl.sessionId,
        cacheResult: true as unknown as SessionIdCacheResult
    },
    [CacheKey.LiquidityPoolsSyncedDiagnosticReadiness]: {
        ttl: envConfig().cache.ttl.liquidityPoolsSyncedDiagnosticReadiness,
        cacheResult: {    
        } as LiquidityPoolsSyncedDiagnosticReadinessResult
    },
    [CacheKey.SendOtpCode]: {
        ttl: envConfig().cache.ttl.sendOtpCode,
        cacheResult: {    
        } as SendOtpCodeCacheResult
    },
}