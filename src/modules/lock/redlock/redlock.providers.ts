import { Provider } from "@nestjs/common"
import Redlock from "redlock"
import { createIoRedisKey } from "@modules/native"
import Redis from "ioredis"
import { REDLOCK_KEY } from "./redlock.module"
import { REDLOCK } from "./constants"

export const createRedlockProvider = (): Provider => ({
    provide: REDLOCK,
    inject: [
        createIoRedisKey(REDLOCK_KEY)
    ],
    useFactory: (redis: Redis) => {
        return new Redlock([
            redis,
        ])
    },
})