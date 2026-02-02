
import {
    BullModule as NestBullModule 
} from "@nestjs/bullmq"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./bullmq.module-definition"
import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    BullQueueName, RegisterQueueOptions 
} from "./types"
import {
    bullData 
} from "./queue"
import {
    envConfig 
} from "@modules/env/config"
import {
    createIoRedisKey, IoRedisInstanceKey, IoRedisModule, 
    RedisOrCluster
} from "@modules/native"

@Module({
})
export class BullModule extends ConfigurableModuleClass {
    // register the queue
    public static registerQueue(options: RegisterQueueOptions = {
    }): DynamicModule {
        const queueName = options.queueName || BullQueueName.ReconcileBalance
        // register the queue
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
                
            }
        })
        return {
            global: options.isGlobal,
            module: BullModule,
            imports: [registerQueueDynamicModule],
            exports: [registerQueueDynamicModule]
        }
    }

    // for root
    public static forRoot(options: typeof OPTIONS_TYPE = {
    }) {
        const dynamicModule = super.forRoot(options)
        return {
            ...dynamicModule,
            imports: [
                NestBullModule.forRootAsync({
                    imports: [
                        IoRedisModule.register({
                            instanceKeys: [
                                IoRedisInstanceKey.BullMQ
                            ],
                        }),
                    ],
                    inject: [createIoRedisKey(IoRedisInstanceKey.BullMQ)],
                    useFactory: async (redis: RedisOrCluster) => ({
                        // connection to redis
                        connection: redis,
                    })
                }),
                // register the queues
                ...Object.values(BullQueueName)
                    .map(queueName => BullModule.registerQueue({
                        isGlobal: true,
                        queueName,
                    })),
            ]
        }
    }
}
