import { Injectable } from "@nestjs/common"
import { InjectRedisCache, InjectMemoryCache } from "./cache.decorators"
import { Cache } from "cache-manager"
import { AsyncService, InjectSuperJson, RetryService } from "@modules/mixin"
import SuperJSON from "superjson"

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
export class CacheService {
    constructor(
    // Redis = primary cache (persistent)
    @InjectRedisCache()
    private readonly redisCacheManager: Cache,
    // Memory = secondary cache (fast)
    @InjectMemoryCache()
    private readonly memoryCacheManager: Cache,
    private readonly asyncService: AsyncService,
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
    private readonly retryService: RetryService,
    ) {}

    /**
   * Serialize a value into a string using SuperJSON.
   */
    private serialize<T>(value: T): string {
    // superjson.serialize() returns { json, meta }
        return this.superjson.stringify(value)
    }

    /**
   * Deserialize a cached string back to its original value.
   */
    private deserialize<T>(value: string): T {
        return this.superjson.parse<T>(value)
    }

    /**
   * Set a single key-value pair in both Redis and memory cache.
   */
    public async set<T>({ key, value, ttl }: SetParams<T>): Promise<void> {
        const serialized = this.serialize(value)
        await this.asyncService.allIgnoreError([
            this.redisCacheManager.set(key, serialized, ttl),
            this.memoryCacheManager.set(key, serialized, ttl),
        ])
    }

    /**
   * Get a single key from cache.
   * - Memory first (fast)
   * - Redis fallback
   * - Rewarm memory if hit in Redis
   */
    public async get<T>(key: string): Promise<T | null> {
    // Memory layer
        const memoryRaw = await this.memoryCacheManager.get<string>(key)
        if (memoryRaw != null) {
            return this.deserialize<T>(memoryRaw)
        }
        // Redis layer
        const redisRaw = await this.redisCacheManager.get<string>(key)
        if (redisRaw != null) {
            // Rewarm memory
            await this.asyncService.allIgnoreError([
                this.memoryCacheManager.set(key, redisRaw),
            ])
            return this.deserialize<T>(redisRaw)
        }
        return null
    }

    /**
   * Get multiple keys from cache in parallel.
   * Memory first, Redis fallback for missing keys.
   */
    public async mget<T>(keys: Array<string>): Promise<Array<T | null>> {
        const results: Array<T | null> = new Array(keys.length).fill(null)

        // Step 1: Memory lookup
        const memoryValues = await this.asyncService.allIgnoreError(
            keys.map(key => this.memoryCacheManager.get<string>(key))
        )
        const missingIndexes: number[] = []
        memoryValues.forEach((val, idx) => {
            if (val != null) {
                results[idx] = this.deserialize<T>(val)
            } else {
                missingIndexes.push(idx)
            }
        })
        // Step 2: Redis lookup for missing
        if (missingIndexes.length > 0) {
            const redisValues = await this.asyncService.allIgnoreError(
                missingIndexes.map(idx => this.redisCacheManager.get<string>(keys[idx]))
            )

            await this.asyncService.allIgnoreError(
                redisValues.map(async (val, i) => {
                    const idx = missingIndexes[i]
                    if (val != null) {
                        results[idx] = this.deserialize<T>(val)
                        await this.memoryCacheManager.set(keys[idx], val)
                    }
                })
            )
        }
        return results
    }

    /**
   * Set multiple key-value pairs in both Redis and memory cache.
   */
    public async mset<T>({ entries }: MSetParams<T>): Promise<void> {
        await this.asyncService.allIgnoreError(
            entries.flatMap(({ key, value, ttl }) => {
                const serialized = this.serialize(value)
                return [
                    this.redisCacheManager.set(key, serialized, ttl),
                    this.memoryCacheManager.set(key, serialized, ttl),
                ]
            })
        )
    }
}