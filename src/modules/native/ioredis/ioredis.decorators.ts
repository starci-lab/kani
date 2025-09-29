import { Inject } from "@nestjs/common"
import { createIoRedisKey } from "./ioredis.constants"

export const InjectIoRedis = (key?: string) => Inject(createIoRedisKey(key))