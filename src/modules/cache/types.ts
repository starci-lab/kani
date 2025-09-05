export enum CacheType {
    Memory = "memory",
    Redis = "redis",
}

export interface CacheOptions {
    types?: Array<CacheType>
}