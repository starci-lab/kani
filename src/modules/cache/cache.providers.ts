import type {
    Provider 
} from "@nestjs/common"
import {
    Cache,
    createCache
} from "cache-manager"
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
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    v4
} from "uuid"
import {
    MEMORY_CACHE_MANAGER,
    REDIS_CACHE_MANAGER,
} from "./constants"
import {
    envConfig,
} from "@modules/env"

export const createRedisCacheManagerProvider = (): Provider => ({
    provide: REDIS_CACHE_MANAGER,
    inject: [
        createRedisKey(RedisInstanceKey.Cache),
        WinstonService,
    ],
    useFactory: async (
        redis: RedisClient,
        winstonService: WinstonService
    ): Promise<Cache> => {
        const keyv = new Keyv(new KeyvRedis(redis))
        const cache = createCache({
            stores: [keyv],
            ttl: 0,
        })

        const { debug } = envConfig().cache
        if (debug.enabled) {
            const randomString = v4()
            const cacheKey = `${debug.ok.redis}:${randomString}`
            await cache.set(
                debug.ok.redis,
                true,
                debug.ttl
            )
            const okRedis = await cache.get(cacheKey)
            assert(okRedis === true)
            winstonService.log(WinstonLog.CacheDebugOkRedis,
                {
                    randomString,
                })
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
                        ttl: 0,
                    }),
                }),
            ],
            ttl: 0,
        })

        const { debug } = envConfig().cache
        if (debug.enabled) {
            const randomString = v4()
            const cacheKey = `${debug.ok.memory}:${randomString}`
            await cache.set(
                cacheKey,
                true,
                debug.ttl
            )
            const okMemory = await cache.get(cacheKey)
            assert(okMemory === true)
            winstonService.log(WinstonLog.CacheDebugOkMemory,
                {
                    randomString,
                }
            )
        }

        return cache
    },
})
