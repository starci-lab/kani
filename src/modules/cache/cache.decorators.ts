import {
    REDIS_CACHE_MANAGER, MEMORY_CACHE_MANAGER 
} from "./constants"
import {
    Inject 
} from "@nestjs/common"

export const InjectRedisCache = () => Inject(REDIS_CACHE_MANAGER)
export const InjectMemoryCache = () => Inject(MEMORY_CACHE_MANAGER)