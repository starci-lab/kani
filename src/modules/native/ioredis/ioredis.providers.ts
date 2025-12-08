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
        const { host, port, password, useCluster, additionalOptions } = options
        if (useCluster) {
            throw new Error("Cluster mode is not supported yet")
        }
        return new Redis(`redis://${host}:${port}`, { ...additionalOptions, password })
    },
})