import {
    Inject 
} from "@nestjs/common"
import {
    MEMORY_CACHE_MANAGER,
    REDIS_CACHE_MANAGER
} from "./constants"

export const InjectRedisCache = (): ReturnType<typeof Inject> =>
    Inject(REDIS_CACHE_MANAGER)

export const InjectMemoryCache = (): ReturnType<typeof Inject> =>
    Inject(MEMORY_CACHE_MANAGER)
