import {
    Injectable, 
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    BotSchema,
    JobType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    DayjsService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    Interval 
} from "@nestjs/schedule"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    Queue 
} from "bullmq"
import {
    BullQueueName, bullData 
} from "@modules/bullmq"
import {
    AsyncService 
} from "@modules/mixin"
import {
    OpenPositionEnqueueService, 
    LiquidityPoolStateService 
} from "@modules/blockchains"
import {
    LockAuthorityService 
} from "../../bussiness"
import {
    InjectPrimaryMongoose 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"

/**
 * Service for requeueing open-position jobs when active jobs exceed TTL.
 *
 * @example
 * const requeueService = app.get(RequeueService)
 * await requeueService.process()
 */
@Injectable()
export class RequeueService implements OnApplicationBootstrap {
    constructor(
        @InjectQueue(bullData[BullQueueName.OpenPosition].name)
        private readonly openPositionQueue: Queue<string>,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionEnqueueService: OpenPositionEnqueueService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {
    }

    onApplicationBootstrap() {
        this.process()
    }
    /**
     * Requeues open-position jobs for bots whose active job exceeds TTL.
     *
     * @returns Promise that resolves when requeue pass completes.
     */
    async process() {
        try {
            // get TTL from config
            const ttl = envConfig().executor.runtime.operation.openPosition.requeue.interval
            // find bots with stale active jobs
            const bots = await this.connection.model<BotSchema>(BotSchema.name).find({
                executor: {
                    $eq: envConfig().executor.id,
                },
                activePosition: {
                    $exists: true,
                    $ne: null,
                },
                "activeJob.jobType": {
                    $eq: JobType.OpenPosition,
                },
                "activeJob.queuedAt": {
                    $exists: true,
                    $lt: this.dayjsService.now()
                        .subtract(ttl,
                            "millisecond")
                        .toDate(),
                },
            })
            // requeue each stale bot
            const promises = bots.map(
                async (bot) => {
                    const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                        id: {
                            $eq: bot.activeJob?.liquidityPool?.toString() ?? "",
                        }
                    })
                    if (!liquidityPool) {
                        throw new LiquidityPoolNotFoundException({
                            id: bot.activeJob?.liquidityPool?.toString() ?? "",
                        })
                    }
                    const bullmqJob = await this.openPositionQueue.getJob(bot.id)
                    if (bullmqJob) {
                        // we can add additional logic here
                        this.winstonService.log(
                            WinstonLog.OpenPositionSkippedActiveJobFoundInQueue,
                            {
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                            }
                        )
                        return
                    }
                    const acquired = await this.lockAuthorityService.acquire(
                        {
                            botId: bot.id,
                        }
                    )
                    if (!acquired) {
                        this.winstonService.log(
                            WinstonLog.OpenPositionLockAuthorityNotAcquired,
                            {
                                botId: bot.id,
                            }
                        )
                        return
                    }
                    try {
                        const state = await this.liquidityPoolStateService.getDynamicLiquidityPoolInfo(liquidityPool)
                        const bullmqJob = await this.openPositionEnqueueService.enqueue(
                            {
                                bot,
                                liquidityPool,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                isRetry: true,
                                state,
                            }
                        )
                        this.winstonService.log(
                            WinstonLog.OpenPositionJobRequeued,
                            {
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                                bullmqJobId: bullmqJob?.id,
                            }
                        )
                    } catch (error) {
                        this.winstonService.log(
                            WinstonLog.OpenPositionJobRequeueFailed,
                            {
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                error: error.message,
                            }
                        )
                        this.lockAuthorityService.release(
                            {
                                botId: bot.id,
                            }
                        )
                    }
                }
            )
            await this.asyncService.allIgnoreError(promises)
        } catch (error) {
            this.winstonService.log(
                WinstonLog.OpenPositionRequeueFailed,
                {
                    error: error.message,
                }
            )
        }
    }

    @Interval(envConfig().executor.runtime.operation.openPosition.requeue.interval)
    handleInterval() {
        this.process()
    }


}