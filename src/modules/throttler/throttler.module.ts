import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./throttler.module-definition"
import {
    ThrottlerModule as ThrottlerCoreModule 
} from "@nestjs/throttler"
import {
    ThrottlerStorageRedisService,
} from "@nest-lab/throttler-storage-redis"
import {
    createIoRedisKey, IoRedisInstanceKey, 
    IoRedisModule
} from "@modules/native"
import {
    RedisOrCluster
} from "@modules/native"
import Redis from "ioredis"
// throttler config
@Module({
})
export class ThrottlerModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const throttlerCoreModule =  ThrottlerCoreModule.forRootAsync(
            {
                imports: [
                    IoRedisModule.register({
                        instanceKeys: [
                            IoRedisInstanceKey.Throttler,
                        ],
                    }),
                ],
                inject: [createIoRedisKey(IoRedisInstanceKey.Throttler)],
                useFactory: (redis: RedisOrCluster) => ({
                    storage:(() => {
                        if (redis instanceof Redis) {
                            return new ThrottlerStorageRedisService(redis)
                        }
                        return new ThrottlerStorageRedisService(redis)
                    })(),
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