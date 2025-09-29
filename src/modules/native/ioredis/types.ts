import { Cluster, Redis } from "ioredis"

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
}

export type RedisOrCluster = Redis | Cluster