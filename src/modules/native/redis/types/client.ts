import type {
    RedisClientType,
    RedisClusterType
} from "redis"

/** Redis client or cluster. */
export type RedisClient = RedisClientType | RedisClusterType
