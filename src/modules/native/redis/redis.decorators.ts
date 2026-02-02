import {
    Inject 
} from "@nestjs/common"
import {
    createRedisKey 
} from "./constants"
import {
    RedisInstanceKey 
} from "./types"

export const InjectRedis = (key: RedisInstanceKey) => Inject(createRedisKey(key))
