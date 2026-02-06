import type {
    Cluster,
    Redis
} from "ioredis"
import type {
    Cluster as ValkeyCluster
} from "iovalkey"
import type Valkey from "iovalkey"

/** Redis or Redis Cluster (ioredis). */
export type RedisOrCluster = Redis | Cluster

/** Valkey or Valkey Cluster (iovalkey). */
export type ValkeyOrCluster = Valkey | ValkeyCluster
