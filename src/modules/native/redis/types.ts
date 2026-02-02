import {
    RedisClientType, RedisClusterType 
} from "redis"

export interface RedisOptions {
    // Instance key
    instanceKeys: Array<RedisInstanceKey>
}

export type RedisClient = RedisClientType | RedisClusterType

export enum RedisInstanceKey {
    Cache = "cache",
    BullMQ = "bullmq",
    LockAuthority = "lock-authority",
    Throttler = "throttler",
    Adapter = "adapter",
}
