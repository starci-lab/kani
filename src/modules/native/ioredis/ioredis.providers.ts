import {
    Provider 
} from "@nestjs/common"
import Redis from "ioredis"
import Valkey from "iovalkey"
import {
    ioRedisInstanceKeyMap 
} from "./config"
import {
    createIoRedisKey 
} from "./constants"
import {
    IoRedisInstanceKey
} from "./enums"

export const createIoRedisProvider = (key: IoRedisInstanceKey): Provider => ({
    provide: createIoRedisKey(key),
    useFactory: (
    ) => {
        const { host, port, password, additionalOptions, useCluster } = ioRedisInstanceKeyMap[key]
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
                        ...additionalOptions,
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
        return new Redis(`redis://${host}:${port}`,
            {
                password, ...additionalOptions 
            })
    },
})