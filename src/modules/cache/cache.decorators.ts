import { CACHE_MANAGER } from "@nestjs/cache-manager"
import { Inject } from "@nestjs/common"
import { REDIS_CACHE_MANAGER, MEMORY_CACHE_MANAGER } from "./cache.constants"

export const InjectCache = () => Inject(CACHE_MANAGER)
export const InjectRedisCache = () => Inject(REDIS_CACHE_MANAGER)
export const InjectMemoryCache = () => Inject(MEMORY_CACHE_MANAGER)