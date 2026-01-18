import {
    CacheKey, configMap 
} from "./config"

// cache type
export enum CacheType {
    Redis = "redis",
    Memory = "memory",
}
// get parameters
export interface GetParams<K extends CacheKey> {
    key: K
    args?: Array<unknown>
    cacheType?: CacheType
}

// set parameters
export interface SetParams<K extends CacheKey> {
    key: K
    args?: Array<unknown>
    cacheResult: typeof configMap[K]["cacheResult"]
    cacheType?: CacheType
}

// delete parameters
export interface DelParams {
    key: CacheKey
    args?: Array<unknown>
    cacheType?: CacheType
}