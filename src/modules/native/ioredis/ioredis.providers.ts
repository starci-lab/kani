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
        const { host, port, password, additionalOptions, useCluster } = options
        if (useCluster) {
            return new Redis.Cluster(
                [
                    {
                        host,
                        port,
                    }
                ],
                {
                    redisOptions: {
                        password,
                        enableAutoPipelining: true,
                        ...additionalOptions,
                    },
                }
            )
        }
        return new Redis(`redis://${host}:${port}`, { password, ...additionalOptions })
    },
})