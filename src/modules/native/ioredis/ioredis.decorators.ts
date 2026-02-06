import {
    Inject 
} from "@nestjs/common"
import {
    createIoRedisKey 
} from "./constants"
import {
    IoRedisInstanceKey
} from "./enums"

export const InjectIoRedis = (key: IoRedisInstanceKey) => Inject(createIoRedisKey(key))