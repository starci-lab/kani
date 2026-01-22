import {
    Provider 
} from "@nestjs/common"
import Redis from "ioredis"
import {
    ioRedisInstanceKeyMap 
} from "./config"
import {
    createIoRedisKey 
} from "./constants"
import {
    IoRedisInstanceKey 
} from "./types"

export const createIoRedisProvider = (key: IoRedisInstanceKey): Provider => ({
    provide: createIoRedisKey(key),
    inject: [],
    useFactory: (
    ) => {
        const { host, port, password, additionalOptions, useCluster } = ioRedisInstanceKeyMap[key]
        if (useCluster) {
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
        return new Redis(`redis://${host}:${port}`,
            {
                password, ...additionalOptions 
            })
    },
})