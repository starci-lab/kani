import {
    Provider 
} from "@nestjs/common"
import Redis from "ioredis"
import Valkey from "iovalkey"
import {
    createIoRedisKey 
} from "./constants"
import {
    IoRedisInstanceKey
} from "./enums"
import {
    envConfig 
} from "@modules/env"
import {
    IoRedisInstanceKeyOptions 
} from "./types"

export const createIoRedisProvider = (key: IoRedisInstanceKey): Provider => ({
    provide: createIoRedisKey(key),
    useFactory: (
    ) => {
        const map: Record<IoRedisInstanceKey, IoRedisInstanceKeyOptions> = {
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
                additionalOptions: {
                    maxRetriesPerRequest: null,
                },
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
        const { host, port, password, useCluster, additionalOptions } = map[key]
        // use valkey if key === IoRedisInstanceKey.Cache
        if (useCluster) {
            if (key === IoRedisInstanceKey.Cache) {
                return new Valkey.Cluster(
                    [
                        {
                            host,
                            port,
                        }
                    ],
                    {
                        redisOptions: {
                            password,
                            enableAutoPipelining: true,
                        },
                    }
                )
            }
            return new Redis.Cluster(
                [
                    {
                        host,
                        port,
                    }
                ],
                {
                    redisOptions: {
                        password,
                        enableAutoPipelining: true,
                        ...(additionalOptions || {
                        }),
                    },
                }
            )
        }
        if (key === IoRedisInstanceKey.Cache) {
            return new Valkey(
                {
                    host,
                    port,
                    password,
                }
            )
        }
        return new Redis(
            `redis://${host}:${port}`,
            {
                password, 
                ...(additionalOptions || {
                }),
            }
        )
    },
})