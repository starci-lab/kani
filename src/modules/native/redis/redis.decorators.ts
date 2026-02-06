import {
    Inject 
} from "@nestjs/common"
import {
    createRedisKey 
} from "./constants"
import {
    RedisInstanceKey
} from "./enums"

export const InjectRedis = (key: RedisInstanceKey) => Inject(createRedisKey(key))
