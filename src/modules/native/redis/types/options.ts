import type {
    RedisClientOptions
} from "redis"
import type {
    RedisInstanceKey
} from "../enums"

/** Options for Redis module (instance keys). */
export interface RedisOptions {
    instanceKeys: Array<RedisInstanceKey>
}

/** Config for a single Redis instance key. */
export interface RedisInstanceKeyOptions {
    host: string
    port: number
    password: string
    useCluster: boolean
    additionalOptions?: RedisClientOptions
}
