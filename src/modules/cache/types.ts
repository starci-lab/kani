export enum CacheType {
    Memory = "memory",
    Redis = "redis",
}   

export interface CacheEntry {
    key: string
    value: string
    ttl: number
}