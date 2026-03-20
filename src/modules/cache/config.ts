import {
    envConfig 
} from "@modules/env"
import {
    CacheKey 
} from "./enums"
import type {
    ActiveCexCacheResult,
    AggregatedTokenPriceCacheResult,
    AggregatedTokenPriceTwapCacheResult,
    CexTokenPriceCacheResult,
    CexTokenVolumeCacheResult,
    ClosePositionSettlementsCacheResult,
    DynamicClmmLiquidityPoolInfoCacheResult,
    DynamicDlmmLiquidityPoolInfoCacheResult,
    LiquidityPoolsSyncedDiagnosticReadinessCacheResult,
    PoolAnalyticsCacheResult,
    RotationBotAssignmentsCacheResult,
    SendOtpCodeCacheResult,
    SessionIdCacheResult,
    ViolateIndicatorResultsCacheResult,
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
    [CacheKey.NatsMessageDigest]: {
        ttl: envConfig().cache.ttl.natsMessageDigest,
        cacheResult: true,
    },
    [CacheKey.ActivePriceCex]: {
        ttl: envConfig().cache.ttl.activePriceCex,
        cacheResult: {
        } as ActiveCexCacheResult,
    },
    [CacheKey.ActiveVolumeCex]: {
        ttl: envConfig().cache.ttl.activeVolumeCex,
        cacheResult: {
        } as ActiveCexCacheResult,
    },
    [CacheKey.CexTokenPriceUpdated]: {
        ttl: envConfig().cache.ttl.cexTokenPriceUpdated,
        cacheResult: {
        } as CexTokenPriceCacheResult,
    },
    [CacheKey.CexTokenVolumeUpdated]: {
        ttl: envConfig().cache.ttl.cexTokenVolumeUpdated,
        cacheResult: {
        } as CexTokenVolumeCacheResult,
    },
    [CacheKey.ViolateIndicatorResults]: {
        ttl: envConfig().cache.ttl.violateIndicatorResults,
        cacheResult: {
        } as ViolateIndicatorResultsCacheResult,
    },
    [CacheKey.ClosePositionSettlements]: {
        ttl: envConfig().cache.ttl.closePositionSettlements,
        cacheResult: [] as ClosePositionSettlementsCacheResult,
    },
}
