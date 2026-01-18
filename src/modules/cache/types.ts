import {
    CacheKey, configMap 
} from "./config"

// cache type
export enum CacheType {
    Redis = "redis",
    Memory = "memory",
}
// get parameters
export interface GetParams {
    key: CacheKey
    args?: Array<unknown>
    cacheType?: CacheType
}

// set parameters
export interface SetParams {
    key: CacheKey
    args?: Array<unknown>
    cacheResult: typeof configMap[CacheKey]["cacheResult"]
    cacheType?: CacheType
}

// delete parameters
export interface DelParams {
    key: CacheKey
    args?: Array<unknown>
    cacheType?: CacheType
}