import {
    envConfig 
} from "@modules/env"
import {
    CacheKey 
} from "./enums"
import type {
    AggregatedTokenPriceCacheResult,
    AggregatedTokenPriceTwapCacheResult,
    DynamicClmmLiquidityPoolInfoCacheResult,
    DynamicDlmmLiquidityPoolInfoCacheResult,
    LiquidityPoolsSyncedDiagnosticReadinessCacheResult,
    PoolAnalyticsCacheResult,
    RotationBotAssignmentsCacheResult,
    SendOtpCodeCacheResult,
    SessionIdCacheResult,
    WithdrawCacheResult,
} from "./types"

/**
 * Map of cache key to TTL and default cache result shape.
 * Used by CacheService for get/set TTL and type inference.
 */
export const configMap = {
    [CacheKey.Withdraw]: {
        ttl: envConfig().cache.ttl.withdraw,
        cacheResult: {
            tokenInputs: [],
        } as WithdrawCacheResult,
    },
    [CacheKey.AggregatedTokenPrice]: {
        ttl: envConfig().cache.ttl.aggregatedTokenPrice,
        cacheResult: {
        } as AggregatedTokenPriceCacheResult,
    },
    [CacheKey.AggregatedTokenPriceTwap]: {
        ttl: envConfig().cache.ttl.aggregatedTokenPriceTwap,
        cacheResult: {
        } as AggregatedTokenPriceTwapCacheResult,
    },
    [CacheKey.DynamicClmmLiquidityPoolInfo]: {
        ttl: envConfig().cache.ttl.dynamicClmmLiquidityPoolInfo,
        cacheResult: {
        } as DynamicClmmLiquidityPoolInfoCacheResult,
    },
    [CacheKey.DynamicDlmmLiquidityPoolInfo]: {
        ttl: envConfig().cache.ttl.dynamicDlmmLiquidityPoolInfo,
        cacheResult: {
        } as DynamicDlmmLiquidityPoolInfoCacheResult,
    },
    [CacheKey.PoolAnalytics]: {
        ttl: envConfig().cache.ttl.poolAnalytics,
        cacheResult: {
        } as PoolAnalyticsCacheResult,
    },
    [CacheKey.SessionId]: {
        ttl: envConfig().cache.ttl.sessionId,
        cacheResult: true as unknown as SessionIdCacheResult,
    },
    [CacheKey.LiquidityPoolsSyncedDiagnosticReadiness]: {
        ttl: envConfig().cache.ttl.liquidityPoolsSyncedDiagnosticReadiness,
        cacheResult: {
        } as LiquidityPoolsSyncedDiagnosticReadinessCacheResult,
    },
    [CacheKey.SendOtpCode]: {
        ttl: envConfig().cache.ttl.sendOtpCode,
        cacheResult: {
        } as SendOtpCodeCacheResult,
    },
    [CacheKey.RotationBotAssignments]: {
        ttl: envConfig().cache.ttl.rotationBotAssignments,
        cacheResult: {
        } as RotationBotAssignmentsCacheResult,
    },
    [CacheKey.KafkaMessageDigest]: {
        ttl: envConfig().cache.ttl.kafkaMessageDigest,
        cacheResult: true,
    },
}
