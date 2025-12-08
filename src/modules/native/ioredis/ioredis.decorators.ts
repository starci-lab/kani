import { Inject } from "@nestjs/common"
import { createIoRedisKey } from "./constants"

export const InjectIoRedis = (key?: string) => Inject(createIoRedisKey(key))