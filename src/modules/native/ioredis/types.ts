import {
    Cluster, Redis 
} from "ioredis"

export interface IoRedisOptions {
    // Instance key
    instanceKey: IoRedisInstanceKey
}

export type RedisOrCluster = Redis | Cluster

export enum IoRedisInstanceKey {
    BullMQ = "bullmq",
    LockAuthority = "lock-authority",
    Throttler = "throttler",
    Adapter = "adapter",
}