
import { BullModule as NestBullModule } from "@nestjs/bullmq"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./bullmq.module-definition"
import { DynamicModule, Module } from "@nestjs/common"
import { BullQueueName, RegisterQueueOptions } from "./types"
import { bullData } from "./queue"
import { envConfig } from "@modules/env/config"
import { createIoRedisKey, IoRedisModule } from "@modules/native"
import Redis from "ioredis"

export const BULLMQ_KEY = "BullMQ"

@Module({})
export class BullModule extends ConfigurableModuleClass {
    // register the queue
    public static registerQueue(options: RegisterQueueOptions = {}): DynamicModule {
        const queueName = options.queueName || BullQueueName.OpenPositionConfirmation
        // register the queue
        const registerQueueDynamicModule = NestBullModule.registerQueue({
            name: `${bullData[queueName].name}`,
            prefix: bullData[queueName].prefix
        })
        return {
            global: options.isGlobal,
            module: BullModule,
            imports: [registerQueueDynamicModule],
            exports: [registerQueueDynamicModule]
        }
    }

    // for root
    public static forRoot(options: typeof OPTIONS_TYPE = {}) {
        const dynamicModule = super.forRoot(options)
        return {
            ...dynamicModule,
            imports: [
                NestBullModule.forRootAsync({
                    imports: [
                        IoRedisModule.register({
                            host: envConfig().redis.bullmq.host,
                            port: envConfig().redis.bullmq.port,
                            password: envConfig().redis.bullmq.password,
                            additionalInstanceKeys: [BULLMQ_KEY],
                            useCluster: envConfig().redis.bullmq.useCluster,
                            additionalOptions: {
                                maxRetriesPerRequest: null,
                            },
                        }),
                    ],
                    inject: [createIoRedisKey(BULLMQ_KEY)],
                    useFactory: async (redis: Redis) => ({
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
