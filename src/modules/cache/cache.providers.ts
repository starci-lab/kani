import {
    Provider 
} from "@nestjs/common"
import {
    Cache, createCache 
} from "cache-manager"
import {
    MEMORY_CACHE_MANAGER, REDIS_CACHE_MANAGER 
} from "./constants"
import KeyvValkey  from "@keyv/valkey"
import Keyv from "keyv"
import {
    CacheableMemory 
} from "cacheable"
import {
    createIoRedisKey, IoRedisInstanceKey, 
    ValkeyOrCluster
} from "@modules/native"
import assert from "assert"
import {
    envConfig 
} from "@modules/env"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"

export const createRedisCacheManagerProvider = (): Provider => ({
    provide: REDIS_CACHE_MANAGER,
    inject: [createIoRedisKey(IoRedisInstanceKey.Cache),
        WinstonService],
    useFactory: async (valkeyOrCluster: ValkeyOrCluster, winstonService: WinstonService): Promise<Cache> => {
        const keyv = new Keyv(new KeyvValkey(valkeyOrCluster))
        const cache = createCache(
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
        // test
        if (envConfig().cache.debug.enabled) {
            // add ok-redis 
            await cache.set(envConfig().cache.debug.ok.redis,
                true,
                envConfig().cache.debug.ttl)
            const okRedis = await cache.get(envConfig().cache.debug.ok.redis)
            assert(okRedis === true)
            winstonService.log(
                WinstonLog.CacheDebugOkRedis,
                {
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
            await cache.set(envConfig().cache.debug.ok.memory,
                true,
                envConfig().cache.debug.ttl)
            const okMemory = await cache.get(envConfig().cache.debug.ok.memory)
            assert(okMemory === true)
            winstonService.log(
                WinstonLog.CacheDebugOkMemory,
                {
                }
            )
        }
        return cache
    },
})
