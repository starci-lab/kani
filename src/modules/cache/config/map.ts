import {
    envConfig 
} from "@modules/env"
import {
    CacheKey
} from "./enum"
import {
    AggregatedTokenPriceCacheResult 
} from "./types"

export const configMap = {
    [CacheKey.AggregatedTokenPrice]: {
        ttl: envConfig().cache.ttl.aggregatedTokenPrice,
        cacheResult: {    
        } as AggregatedTokenPriceCacheResult
    },
}