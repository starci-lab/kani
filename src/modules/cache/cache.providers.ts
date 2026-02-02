import {
    Provider 
} from "@nestjs/common"
import {
    Cache, createCache 
} from "cache-manager"
import {
    MEMORY_CACHE_MANAGER, REDIS_CACHE_MANAGER 
} from "./constants"
import KeyvRedis, {
    Keyv 
} from "@keyv/redis"
import {
    CacheableMemory 
} from "cacheable"
import {
    createRedisKey, 
    RedisInstanceKey, 
    RedisClient
} from "@modules/native"
import assert from "assert"
import {
    envConfig 
} from "@modules/env"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    v4 
} from "uuid"

export const createRedisCacheManagerProvider = (): Provider => ({
    provide: REDIS_CACHE_MANAGER,
    inject: [createRedisKey(RedisInstanceKey.Cache),
        WinstonService],
    useFactory: async (
        redis: RedisClient, 
        winstonService: WinstonService
    ): Promise<Cache> => {
        const keyv = new Keyv(new KeyvRedis(redis))
        const cache = createCache(
            {
                stores: [
                    // priority cache
                    keyv, 
                ],
                ttl: 0,
            }
        )
        // test
        if (envConfig().cache.debug.enabled) {
            // add ok-redis 
            const randomString = v4()
            await cache.set(
                envConfig().cache.debug.ok.redis,
                randomString,
                envConfig().cache.debug.ttl
            )
            const okRedis = await cache.get(envConfig().cache.debug.ok.redis)
            assert(okRedis === randomString)
            winstonService.log(
                WinstonLog.CacheDebugOkRedis,
                {
                    randomString,
                }
            )
        }
        return cache
    },
})

export const createMemoryCacheManagerProvider = (): Provider => ({
    provide: MEMORY_CACHE_MANAGER,
    inject: [WinstonService],
    useFactory: async (winstonService: WinstonService): Promise<Cache> => {
        const cache = createCache({
            stores: [
                new Keyv({
                    store: new CacheableMemory({
                        ttl: 0 
                    }),
                }),
            ],
            ttl: 0,
        })
        if (envConfig().cache.debug.enabled) {
            // add ok-memory
            const randomString = v4()
            await cache.set(
                envConfig().cache.debug.ok.memory,
                randomString,
                envConfig().cache.debug.ttl
            )
            const okMemory = await cache.get(envConfig().cache.debug.ok.memory)
            assert(okMemory === randomString)
            winstonService.log(
                WinstonLog.CacheDebugOkMemory,
                {
                    randomString,
                }
            )
        }
        return cache
    },
})
