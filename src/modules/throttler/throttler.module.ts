import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./throttler.module-definition"
import { ThrottlerModule as ThrottlerCoreModule } from "@nestjs/throttler"
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis"
import { envConfig } from "@modules/env"
import { createIoRedisKey, IoRedisModule } from "@modules/native"
import Redis from "ioredis"
// throttler config
@Module({})
export class ThrottlerModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const throttlerCoreModule = ThrottlerCoreModule.forRootAsync(
            {
                imports: [
                    IoRedisModule.register({
                        host: envConfig().redis.throttler.host,
                        port: envConfig().redis.throttler.port,
                        password: envConfig().redis.throttler.password,
                    }),
                ],
                inject: [createIoRedisKey()],
                useFactory: (redis: Redis) => ({
                    storage: new ThrottlerStorageRedisService(redis),
                    throttlers: [],
                }),
            })
        return {
            ...dynamicModule,
            imports: [
                throttlerCoreModule,
            ],
        }
    }
}