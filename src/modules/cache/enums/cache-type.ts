/** Backend used for cache (Redis = shared, Memory = process-local). */
export enum CacheType {
    Redis = "redis",
    Memory = "memory",
}
