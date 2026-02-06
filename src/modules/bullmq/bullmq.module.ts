import {
    BullModule as NestBullModule
} from "@nestjs/bullmq"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE
} from "./bullmq.module-definition"
import {
    DynamicModule,
    Module
} from "@nestjs/common"
import {
    BullQueueName 
} from "./enums"
import {
    RegisterQueueOptions
} from "./types"
import {
    bullData
} from "./constants"
import {
    envConfig
} from "@modules/env/config"
import {
    createIoRedisKey,
    IoRedisInstanceKey,
    IoRedisModule,
    RedisOrCluster
} from "@modules/native"

/**
 * NestJS module for BullMQ queue registration and Redis connection.
 * Registers queues by name and provides forRoot with async Redis.
 *
 * @example
 * BullModule.forRoot()
 * BullModule.registerQueue({ queueName: BullQueueName.OpenPosition, isGlobal: true })
 */
@Module({
})
export class BullModule extends ConfigurableModuleClass {
    /**
     * Registers a single BullMQ queue with name/prefix from bullData and env job options.
     *
     * @param options - Optional queue name and global flag (default: ReconcileBalance, non-global)
     * @returns Dynamic module that imports/exports the registered queue
     *
     * @example
     * BullModule.registerQueue({ queueName: BullQueueName.OpenPosition, isGlobal: true })
     */
    public static registerQueue(options: RegisterQueueOptions = {
    }): DynamicModule {
        const queueName = options.queueName ?? BullQueueName.ReconcileBalance

        const registerQueueDynamicModule = NestBullModule.registerQueue({
            name: `${bullData[queueName].name}`,
            prefix: bullData[queueName].prefix,
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: true,
                attempts: envConfig().bullmq.attempts,
                backoff: {
                    type: "exponential",
                    delay: envConfig().bullmq.delay,
                },
            },
        })

        return {
            global: options.isGlobal,
            module: BullModule,
            imports: [registerQueueDynamicModule],
            exports: [registerQueueDynamicModule],
        }
    }

    /**
     * Configures the module at root with Redis connection and all queues registered globally.
     *
     * @param options - Module options (from configurable builder)
     * @returns Dynamic module with forRootAsync Redis and one registered queue per BullQueueName
     */
    public static forRoot(options: typeof OPTIONS_TYPE = {
    }): DynamicModule {
        const dynamicModule = super.forRoot(options)

        const queueModules: Array<DynamicModule> = Object.values(BullQueueName)
            .map((name) =>
                BullModule.registerQueue({
                    isGlobal: true,
                    queueName: name,
                })
            )

        return {
            ...dynamicModule,
            imports: [
                NestBullModule.forRootAsync({
                    imports: [
                        IoRedisModule.register({
                            instanceKeys: [
                                IoRedisInstanceKey.BullMQ,
                            ],
                        }),
                    ],
                    inject: [createIoRedisKey(IoRedisInstanceKey.BullMQ)],
                    useFactory: async (redis: RedisOrCluster) => ({
                        connection: redis,
                    }),
                }),
                ...queueModules,
            ],
        }
    }
}
