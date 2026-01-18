import {
    Provider 
} from "@nestjs/common"
import {
    Cache, createCache 
} from "cache-manager"
import {
    MEMORY_CACHE_MANAGER, REDIS_CACHE_MANAGER 
} from "./constants"
import KeyvRedis from "@keyv/redis"
import {
    envConfig 
} from "@modules/env"
import Keyv from "keyv"
import {
    createClient 
} from "redis"
import {
    CacheableMemory 
} from "cacheable"

export const createRedisCacheManagerProvider = (): Provider => ({
    provide: REDIS_CACHE_MANAGER,
    useFactory: async (): Promise<Cache> => {
        const client = createClient(
            {
                url: `redis://${envConfig().redis.cache.host}:${envConfig().redis.cache.port}`,
                password: envConfig().redis.cache.password,
            }
        )
        await client.connect()
        const keyv = new Keyv(new KeyvRedis(client))
        return createCache(
            {
                stores: [
                // priority cache
                    keyv, 
                    // fallback cache
                    new Keyv({
                        store: new CacheableMemory({
                            ttl: 0 
                        }),
                    }
                    )
                ],
                ttl: 0,
            }
        )
    },
})

export const createMemoryCacheManagerProvider = (): Provider => ({
    provide: MEMORY_CACHE_MANAGER,
    useFactory: async (): Promise<Cache> => {
        return createCache({
            stores: [
                new Keyv({
                    store: new CacheableMemory({
                        ttl: 0 
                    }),
                }),
            ],
        })
    },
})
