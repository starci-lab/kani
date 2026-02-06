import {
    envConfig 
} from "@modules/env"

/** Cache configuration shape (TTL, debug, stale) from env. */
export type CacheConfig = ReturnType<typeof envConfig>["cache"]
