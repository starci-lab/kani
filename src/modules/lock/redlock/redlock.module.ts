import { IoRedisModule } from "@modules/native"
import { ConfigurableModuleClass } from "./redlock.module-definition"
import { Module } from "@nestjs/common"
import { envConfig } from "@modules/env"
import { createRedlockProvider } from "./redlock.providers"
import { RedlockService } from "./redlock.service"

export const REDLOCK_KEY = "Redlock"
@Module({
    imports: [
        IoRedisModule.register(
            {
                host: envConfig().redis.lock.host,
                port: envConfig().redis.lock.port,
                password: envConfig().redis.lock.password,
                useCluster: envConfig().redis.lock.useCluster,
                additionalInstanceKeys: [REDLOCK_KEY],
            }
        )
    ],
    providers: [
        createRedlockProvider(),
        RedlockService,
    ],
    exports: [
        createRedlockProvider(),
        RedlockService,
    ],
})
export class RedlockModule extends ConfigurableModuleClass {}