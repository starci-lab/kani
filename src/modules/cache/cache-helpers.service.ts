import { Inject, Injectable } from "@nestjs/common"
import { CacheType } from "./types"
import { Cache } from "cache-manager"
import { ModuleRef } from "@nestjs/core"
import { MEMORY_CACHE_MANAGER, REDIS_CACHE_MANAGER } from "./cache.constants"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./cache.module-definition"

export interface GetOrSetCacheParams<T> {
  key: string;
  type?: CacheType;
  action: () => Promise<T>;
  autoSelect?: boolean;
}

export interface GetCacheManagerParams {
  type?: CacheType;
  autoSelect?: boolean;
}

export interface MGetParams {
    keys: Array<string>;
    type?: CacheType;
    autoSelect?: boolean;
}
  
export interface MSetParams<T> {
    entries: Array<{ key: string; value: T }>;
    type?: CacheType;
    autoSelect?: boolean;
}

@Injectable()
export class CacheHelpersService {
    private readonly memoryCacheManager: Cache | undefined
    private readonly redisCacheManager: Cache | undefined
    constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: typeof OPTIONS_TYPE,
    private readonly moduleRef: ModuleRef,
    ) {
        if (!this.options.types || this.options.types.includes(CacheType.Memory)) {
            this.memoryCacheManager = this.moduleRef.get(
                MEMORY_CACHE_MANAGER, 
                { strict: false }
            )
        }
        if (!this.options.types || this.options.types.includes(CacheType.Redis)) {
            this.redisCacheManager = this.moduleRef.get(
                REDIS_CACHE_MANAGER, 
                { strict: false }
            )
        }
    }

    private getAutoSelectType(): CacheType {
        if (!this.options.types || this.options.types.includes(CacheType.Redis)) {
            return CacheType.Redis
        }
        if (!this.options.types || this.options.types.includes(CacheType.Memory)) {
            return CacheType.Memory
        }
        // fallback to memory
        return CacheType.Memory
    }

    public getCacheManager(
        { type = CacheType.Redis, autoSelect = false }: GetCacheManagerParams
    ): Cache {
        const cacheType = autoSelect ? this.getAutoSelectType() : type
        switch (cacheType) {
        case CacheType.Memory:
            return this.memoryCacheManager as Cache
        case CacheType.Redis:
            return this.redisCacheManager as Cache
        }
    }

    public async getOrSetCache<T>({
        key,
        action,
        type = CacheType.Redis,
        autoSelect = false,
    }: GetOrSetCacheParams<T>): Promise<T> {
        const cacheManager = this.getCacheManager({ type, autoSelect })
        const cache = await cacheManager?.get<T>(key)
        if (cache) {
            return cache
        }
        const result = await action()
        await cacheManager?.set(key, result)
        return result
    }

    public async mget<T>({
        keys,
        type = CacheType.Redis,
        autoSelect = true,
    }: MGetParams): Promise<Array<T | undefined>> {
        const cacheType = autoSelect ? this.getAutoSelectType() : type
        const cacheManager = this.getCacheManager({ type, autoSelect })

        switch(cacheType) {
        case CacheType.Redis: {

            return cacheManager.mget<T>(keys)
        }
        case CacheType.Memory:
        {
            const results: Array<T | undefined> = []
            for (const key of keys) {
                const value = await cacheManager?.get<T>(key)
                results.push(value)
            }
            return results
        }
        }
    }

    public async mset<T>({
        entries,
        type = CacheType.Redis,
        autoSelect = true,
    }: MSetParams<T>): Promise<void> {
        const cacheType = autoSelect ? this.getAutoSelectType() : type
        const cacheManager = this.getCacheManager({ type, autoSelect })
    
        switch (cacheType) {
        case CacheType.Redis: {
            await cacheManager.mset(entries)
            break
        }
        case CacheType.Memory: {
            for (const entry of entries) {
                await cacheManager.set(entry.key, entry.value)
            }
            break
        }
        }
    }
}
