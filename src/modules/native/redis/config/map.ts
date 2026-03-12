import {
    envConfig
} from "@modules/env"
import {
    RedisInstanceKey
} from "../enums"
import type {
    RedisInstanceKeyOptions
} from "../types"

export const redisInstanceKeyMap = (): Record<
    RedisInstanceKey,
    RedisInstanceKeyOptions
> => ({
    [RedisInstanceKey.BullMQ]: {
        host: envConfig().redis.bullmq.host,
        port: envConfig().redis.bullmq.port,
        password: envConfig().redis.bullmq.password,
        useCluster: envConfig().redis.bullmq.useCluster,
    },
    [RedisInstanceKey.LockAuthority]: {
        host: envConfig().redis.lockAuthority.host,
        port: envConfig().redis.lockAuthority.port,
        password: envConfig().redis.lockAuthority.password,
        useCluster: envConfig().redis.lockAuthority.useCluster,
    },
    [RedisInstanceKey.Throttler]: {
        host: envConfig().redis.throttler.host,
        port: envConfig().redis.throttler.port,
        password: envConfig().redis.throttler.password,
        useCluster: envConfig().redis.throttler.useCluster,
    },
    [RedisInstanceKey.Adapter]: {
        host: envConfig().redis.adapter.host,
        port: envConfig().redis.adapter.port,
        password: envConfig().redis.adapter.password,
        useCluster: envConfig().redis.adapter.useCluster,
    },
    [RedisInstanceKey.Cache]: {
        host: envConfig().redis.cache.host,
        port: envConfig().redis.cache.port,
        password: envConfig().redis.cache.password,
        useCluster: envConfig().redis.cache.useCluster,
    },
})
