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

export const createRedisCacheManagerProvider = (): Provider => ({
    provide: REDIS_CACHE_MANAGER,
    inject: [createIoRedisKey(IoRedisInstanceKey.Cache)],
    useFactory: async (valkeyOrCluster: ValkeyOrCluster): Promise<Cache> => {
        const keyv = new Keyv(new KeyvValkey(valkeyOrCluster))
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
