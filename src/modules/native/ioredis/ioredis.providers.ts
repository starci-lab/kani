import { Provider } from "@nestjs/common"
import Redis from "ioredis"
import { createIoRedisKey } from "./constants"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./ioredis.module-definition"

export const createIoRedisProvider = (key?: string): Provider => ({
    provide: createIoRedisKey(key),
    inject: [MODULE_OPTIONS_TOKEN],
    useFactory: (
        options: typeof OPTIONS_TYPE,
    ) => {
        const { host, port, password, additionalOptions } = options
        return new Redis(`redis://${host}:${port}`, { password, ...additionalOptions })
    },
})