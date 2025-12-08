export const IOREDIS = "IoRedis"
export const createIoRedisKey = (key?: string) => key ? `${IOREDIS}:${key}` : IOREDIS