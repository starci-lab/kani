import {
    Provider 
} from "@nestjs/common"
import {
    createClient, createCluster 
} from "redis"
import {
    redisInstanceKeyMap 
} from "./config"
import {
    createRedisKey 
} from "./constants"
import {
    RedisInstanceKey
} from "./enums"

export const createRedisProvider = (key: RedisInstanceKey): Provider => ({
    provide: createRedisKey(key),
    useFactory: async () => {
        const { 
            host, 
            port, 
            password, 
            additionalOptions, 
            useCluster 
        } = redisInstanceKeyMap()[key]
        if (useCluster) {
            const cluster = createCluster({
                rootNodes: [
                    {
                        socket: {
                            host,
                            port,
                        },
                    },
                ],
                defaults: {
                    password,
                    ...additionalOptions,
                },
            })
            await cluster.connect()
            return cluster
        }
        
        const client = createClient({
            socket: {
                host,
                port,
            },
            password,
            ...additionalOptions,
        })
        await client.connect()
        return client
    },
})
