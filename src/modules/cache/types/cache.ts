import type {
    CacheKey,
    CacheType,
} from "../enums"
import {
    configMap 
} from "../config"

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
    cacheResult: typeof configMap[K]["cacheResult"]
    cacheType?: CacheType
}

/** Params for cache delete (key, optional args, cache type). */
export interface DelParams {
    key: CacheKey
    args?: Array<unknown>
    cacheType?: CacheType
}
