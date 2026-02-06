import {
    Injectable
} from "@nestjs/common"
import type {
    Cache 
} from "cache-manager"
import {
    InjectMemoryCache,
    InjectRedisCache
} from "./cache.decorators"
import {
    CacheKey,
    CacheType
} from "./enums"
import {
    DelParams,
    GetParams,
    SetParams
} from "./types"
import {
    InjectSuperJson
} from "@modules/mixin"
import type SuperJSON from "superjson"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    configMap 
} from "./config"

/**
 * Service for get/set/del cache entries by logical key and optional args.
 * Uses Redis (shared) or Memory (process-local) and SuperJSON for serialization.
 *
 * @example
 * await cacheService.set({ key: CacheKey.Withdraw, args: [id], cacheResult: data })
 */
@Injectable()
export class CacheService {
    constructor(
        @InjectRedisCache()
        private readonly redisCacheManager: Cache,

        @InjectMemoryCache()
        private readonly memoryCacheManager: Cache,

        @InjectSuperJson()
        private readonly superjson: SuperJSON,

        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Builds the physical cache key string from logical key and optional args.
     *
     * @param key - Logical cache key
     * @param args - Optional arguments (serialized into key)
     * @returns Physical key string
     */
    getCacheKey(key: CacheKey, args?: Array<unknown>): string {
        return `${key}:${args?.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(":")}`
    }

    /**
     * Retrieves a cached value by logical key and optional args.
     *
     * @param param - Key, optional args, cache type (default Redis)
     * @returns Parsed cache value or undefined if missing
     *
     * @example
     * const value = await cacheService.get({ key: CacheKey.AggregatedTokenPrice, args: [id] })
     */
    async get<K extends CacheKey>({
        key,
        args,
        cacheType = CacheType.Redis,
    }: GetParams<K>): Promise<(typeof configMap)[K]["cacheResult"] | undefined> {
        const cacheKey = this.getCacheKey(key,
            args)

        try {
            const cacheManager =
                cacheType === CacheType.Redis
                    ? this.redisCacheManager
                    : this.memoryCacheManager

            const serializedCachedResult =
                await cacheManager.get<string>(cacheKey)

            if (!serializedCachedResult) {
                return undefined
            }

            return this.superjson.parse<(typeof configMap)[K]["cacheResult"]>(
                serializedCachedResult
            )
        } catch (error) {
            this.winstonService.log(WinstonLog.ErrorGettingCache,
                {
                    error: (error as Error).message,
                    cacheKey,
                    cacheType,
                })
            throw error
        }
    }

    /**
     * Stores a value in cache with TTL from config map.
     *
     * @param param - Key, args, cache result, cache type (default Redis)
     *
     * @example
     * await cacheService.set({ key: CacheKey.Withdraw, args: [id], cacheResult })
     */
    async set<K extends keyof typeof configMap>({
        key,
        args,
        cacheResult,
        cacheType = CacheType.Redis,
    }: SetParams<K>): Promise<void> {
        const cacheKey = this.getCacheKey(key,
            args)

        try {
            const serializedCachedResult =
                this.superjson.stringify(cacheResult)

            const cacheManager =
                cacheType === CacheType.Redis
                    ? this.redisCacheManager
                    : this.memoryCacheManager

            const ttl =
                cacheType === CacheType.Redis
                    ? configMap[key].ttl
                    : configMap[key].ttl * 1000

            await cacheManager.set(
                cacheKey,
                serializedCachedResult,
                ttl,
            )
        } catch (error) {
            this.winstonService.log(WinstonLog.ErrorSettingCache,
                {
                    error: (error as Error).message,
                    cacheKey,
                    cacheType,
                })
            throw error
        }
    }

    /**
     * Deletes a cached value by logical key and optional args.
     *
     * @param param - Key, optional args, cache type (default Redis)
     */
    async del({
        key,
        args,
        cacheType = CacheType.Redis,
    }: DelParams): Promise<void> {
        const cacheKey = this.getCacheKey(key,
            args)

        try {
            const cacheManager =
                cacheType === CacheType.Redis
                    ? this.redisCacheManager
                    : this.memoryCacheManager

            await cacheManager.del(cacheKey)
        } catch (error) {
            this.winstonService.log(WinstonLog.ErrorDeletingCache,
                {
                    error: (error as Error).message,
                    cacheKey,
                    cacheType,
                })
            throw error
        }
    }
}
