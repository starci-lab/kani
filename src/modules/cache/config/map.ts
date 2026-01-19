import {
    envConfig 
} from "@modules/env"
import {
    CacheKey
} from "./enum"
import {
    AggregatedTokenPriceCacheResult,
    DynamicClmmLiquidityPoolInfoCacheResult, 
    DynamicDlmmLiquidityPoolInfoCacheResult, 
    PoolAnalyticsCacheResult,
    SessionIdCacheResult
} from "./types"

export const configMap = {
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
}