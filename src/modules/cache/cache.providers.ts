import { Provider } from "@nestjs/common"
import { Cache, createCache } from "cache-manager"
import { MEMORY_CACHE_MANAGER, REDIS_CACHE_MANAGER } from "./constants"
import KeyvRedis from "@keyv/redis"
import { envConfig } from "@modules/env"
import Keyv from "keyv"
import { createClient } from "redis"
import { CacheableMemory } from "cacheable"

export const createRedisCacheManagerProvider = (): Provider => ({
    provide: REDIS_CACHE_MANAGER,
    useFactory: async (): Promise<Cache> => {
        const client = createClient({
            url: `redis://${envConfig().redis.host}:${envConfig().redis.port}`,
            password: envConfig().redis.password,
        })
        await client.connect()
        const keyv = new Keyv(new KeyvRedis(client))
        return createCache({
            stores: [keyv],
            ttl: envConfig().cache.redisTtl,
        })
    },
})

export const createMemoryCacheManagerProvider = (): Provider => ({
    provide: MEMORY_CACHE_MANAGER,
    useFactory: async (): Promise<Cache> => {
        return createCache({
            stores: [
                new Keyv({
                    store: new CacheableMemory({ ttl: envConfig().cache.memoryTtl }),
                }),
            ],
        })
    },
})
