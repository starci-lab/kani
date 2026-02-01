import {
    RedisOptions 
} from "ioredis"
import {
    IoRedisInstanceKey 
} from "../types"
import {
    envConfig 
} from "@modules/env"

export interface IoRedisInstanceKeyOptions {
    host: string
    port: number
    password: string
    useCluster: boolean
    additionalOptions?: RedisOptions
}

export const ioRedisInstanceKeyMap: Record<IoRedisInstanceKey, IoRedisInstanceKeyOptions> = {
    [IoRedisInstanceKey.BullMQ]: {
        host: envConfig().redis.bullmq.host,
        port: envConfig().redis.bullmq.port,
        password: envConfig().redis.bullmq.password,
        useCluster: envConfig().redis.bullmq.useCluster,
        additionalOptions: {
            maxRetriesPerRequest: null,
        },
    },
    [IoRedisInstanceKey.LockAuthority]: {
        host: envConfig().redis.lockAuthority.host,
        port: envConfig().redis.lockAuthority.port,
        password: envConfig().redis.lockAuthority.password,
        useCluster: envConfig().redis.lockAuthority.useCluster,
    },
    [IoRedisInstanceKey.Throttler]: {
        host: envConfig().redis.throttler.host,
        port: envConfig().redis.throttler.port,
        password: envConfig().redis.throttler.password,
        useCluster: envConfig().redis.throttler.useCluster,
    },
    [IoRedisInstanceKey.Adapter]: {
        host: envConfig().redis.adapter.host,
        port: envConfig().redis.adapter.port,
        password: envConfig().redis.adapter.password,
        useCluster: envConfig().redis.adapter.useCluster,
    },
    [IoRedisInstanceKey.Cache]: {
        host: envConfig().redis.cache.host,
        port: envConfig().redis.cache.port,
        password: envConfig().redis.cache.password,
        useCluster: envConfig().redis.cache.useCluster,
    },
}