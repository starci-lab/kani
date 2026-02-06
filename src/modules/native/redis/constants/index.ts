export const REDIS = "Redis"
export const createRedisKey = (key?: string) =>
    key ? `${REDIS}:${key}` : REDIS
