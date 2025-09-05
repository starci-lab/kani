import { Injectable } from "@nestjs/common"
import { InjectMemoryCache, InjectRedisCache } from "./cache.decorators"
import { CacheType } from "./types"
import { Cache } from "cache-manager"

export interface GetOrSetCacheParams<T> {
    key: string
    type: CacheType
    action: () => Promise<T>
}

@Injectable()
export class CacheHelpersService {
    constructor(
        @InjectMemoryCache()
        private readonly memoryCacheManager: Cache,
        @InjectRedisCache()
        private readonly redisCacheManager: Cache,
    ) { }

    private getCacheManager(type: CacheType = CacheType.Redis) {
        switch (type) {
        case CacheType.Memory:
            return this.memoryCacheManager
        case CacheType.Redis:
            return this.redisCacheManager
        }
    }

    public async getOrSetCache<T>({
        key,
        action,
        type,
    }: GetOrSetCacheParams<T>): Promise<T> {
        const cacheManager = this.getCacheManager(type)
        const cache = await cacheManager.get<T>(key)
        if (cache) {
            return cache
        }
        const result = await action()
        await cacheManager.set(key, result)
        return result
    }
}