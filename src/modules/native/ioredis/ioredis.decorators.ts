import {
    Inject 
} from "@nestjs/common"
import {
    createIoRedisKey 
} from "./constants"
import {
    IoRedisInstanceKey 
} from "./types"

export const InjectIoRedis = (key: IoRedisInstanceKey) => Inject(createIoRedisKey(key))