import { Injectable } from "@nestjs/common"
import { InjectRedisCache, InjectMemoryCache } from "./cache.decorators"
import { Cache } from "cache-manager"
import { AsyncService } from "@modules/mixin"

interface SetParams<T> {
  key: string
  value: T
  ttl?: number
}

interface MSetParams<T> {
  entries: {
    key: string
    value: T
    ttl?: number
  }[]
}

@Injectable()
export class CacheManagerService {
    constructor(
    // Redis = primary cache (persistent)
    @InjectRedisCache()
    private readonly redisCacheManager: Cache,

    // Memory = secondary cache (faster, in-memory)
    @InjectMemoryCache()
    private readonly memoryCacheManager: Cache,

    private readonly asyncService: AsyncService
    ) {}

    /**
   * Set a single key-value pair in both Redis and memory cache.
   * If one of them fails, the error is ignored.
   */
    public async set<T>({ key, value, ttl }: SetParams<T>): Promise<void> {
        await this.asyncService.allIgnoreError([
            this.redisCacheManager.set(key, value, ttl),
            this.memoryCacheManager.set(key, value, ttl),
        ])
    }

    /**
   * Get a single key from cache.
   * - First tries memory (fastest)
   * - If not found, falls back to Redis
   * - If found in Redis, re-warms memory cache
   */
    public async get<T>(key: string): Promise<T | null> {
        // try to get from memory cache
        const memoryValue = await this.memoryCacheManager.get<T>(key)
        if (memoryValue !== null && memoryValue !== undefined) {
            return memoryValue
        }

        // try to get from redis cache
        const redisValue = await this.redisCacheManager.get<T>(key)
        if (redisValue !== null && redisValue !== undefined) {
            // Re-populate memory cache for faster subsequent reads
            await this.asyncService.allIgnoreError([
                this.memoryCacheManager.set(key, redisValue),
            ])
        }

        // return null if not found in both caches
        return redisValue ?? null
    }

    /**
   * Get multiple keys from cache in parallel.
   * - Checks memory first for all keys
   * - For missing keys, fetches from Redis in parallel
   * - Warms memory for keys found in Redis
   * Returns an array of results in the same order as the input keys.
   */
    public async mget<T>(keys: Array<string>): Promise<(T | null)[]> {
        const results: Array<T | null> = new Array(keys.length).fill(null)

        // Step 1: Try memory for all keys
        const memoryValues = await this.asyncService.allIgnoreError(
            keys.map(key => this.memoryCacheManager.get<T>(key))
        )

        // Step 2: Fill results from memory & collect missing indexes
        const missingIndexes: Array<number> = []
        memoryValues.forEach((val, idx) => {
            if (val != null) {
                results[idx] = val
            } else {
                missingIndexes.push(idx)
            }
        })

        // Step 3: Fetch missing keys from Redis
        if (missingIndexes.length > 0) {
            const redisValues = await this.asyncService.allIgnoreError(
                missingIndexes.map(idx => this.redisCacheManager.get<T>(keys[idx]))
            )

            // Step 4: Update results & warm memory for redis hits
            await this.asyncService.allIgnoreError(
                redisValues.map(async (val, i) => {
                    const idx = missingIndexes[i]
                    if (val != null) {
                        results[idx] = val
                        await this.memoryCacheManager.set(keys[idx], val)
                    }
                })
            )
        }

        return results
    }

    /**
   * Set multiple key-value pairs in both Redis and memory cache.
   * Runs all operations in parallel.
   * Ignores errors from either layer.
   */
    public async mset<T>({ entries }: MSetParams<T>): Promise<void> {
        await this.asyncService.allIgnoreError(
            entries.flatMap(({ key, value, ttl }) => [
                this.redisCacheManager.set(key, value, ttl),
                this.memoryCacheManager.set(key, value, ttl),
            ])
        )
    }
}
