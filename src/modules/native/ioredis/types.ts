import { Cluster, Redis, RedisOptions } from "ioredis"

export interface IoRedisOptions {
    // Whether to use a Redis cluster
    useCluster?: boolean
    // The host of the Redis server
    host: string
    // The port of the Redis server
    port: number
    // The password of the Redis server
    password: string
    // Additional instance keys
    additionalInstanceKeys?: Array<string>
    // Additional options
    additionalOptions?: RedisOptions
}

export type RedisOrCluster = Redis | Cluster