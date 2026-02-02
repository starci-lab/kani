import {
    Cluster, Redis 
} from "ioredis"
import Valkey, {
    Cluster as ValkeyCluster 
} from "iovalkey"

export interface IoRedisOptions {
    // Instance key
    instanceKeys: Array<IoRedisInstanceKey>
}

export type RedisOrCluster = Redis | Cluster
export type ValkeyOrCluster = Valkey | ValkeyCluster

export enum IoRedisInstanceKey {
    Cache = "cache",
    BullMQ = "bullmq",
    LockAuthority = "lock-authority",
    Throttler = "throttler",
    Adapter = "adapter",
}