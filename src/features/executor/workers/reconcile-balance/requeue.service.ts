import {
    Injectable, 
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    JobType,
    BotSchema,
    InjectPrimaryMongoose,
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
    ReconcileBalanceEnqueueService 
} from "@modules/blockchains/balance"
import {
    LockAuthorityService    
} from "../../bussiness"
import {
    Connection 
} from "mongoose"

/**
 * Service for requeueing reconcile-balance jobs when active jobs exceed TTL.
 *
 * @example
 * const requeueService = app.get(RequeueService)
 * await requeueService.process()
 */
@Injectable()
export class RequeueService implements OnApplicationBootstrap {
    constructor(
        @InjectQueue(bullData[BullQueueName.ReconcileBalance].name)
        private readonly reconcileBalanceQueue: Queue<string>,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly reconcileBalanceEnqueueService: ReconcileBalanceEnqueueService,
        private readonly lockAuthorityService: LockAuthorityService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {
    }

    onApplicationBootstrap() {
        this.process()
    }
    /**
     * Requeues reconcile-balance jobs for bots whose active job exceeds TTL.
     *
     * @returns Promise that resolves when requeue pass completes.
     */
    async process() {
        try {
            // get TTL from config
            const ttl = envConfig().executor.runtime.operation.reconcileBalance.requeue.interval
            // find bots with stale active jobs
            const bots = await this.connection.model<BotSchema>(BotSchema.name).find({
                executor: {
                    $eq: envConfig().executor.id,
                },
                activePosition: {
                    $exists: false,
                },
                "activeJob.jobType": {
                    $eq: JobType.ReconcileBalance,
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
                    const bullmqJob = await this.reconcileBalanceQueue.getJob(bot.id)
                    if (bullmqJob) {
                        // skip if job already in queue
                        return
                    }
                    const acquired = await this.lockAuthorityService.acquire(
                        {
                            botId: bot.id,
                        }
                    )
                    if (!acquired) return
                    try {
                        const bullmqJob = await this.reconcileBalanceEnqueueService.enqueue(
                            {
                                bot,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                isRetry: true,
                            }
                        )
                        this.winstonService.log(
                            WinstonLog.ReconcileBalanceJobRequeued,
                            {
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                botId: bot.id,
                                bullmqJobId: bullmqJob?.id,
                            }
                        )
                    } catch (error) {
                        this.winstonService.log(
                            WinstonLog.ReconcileBalanceJobRequeueFailed,
                            {
                                botId: bot.id,
                                error: error.message,
                                jobId: bot.activeJob?.job?.toString() ?? "",
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
                WinstonLog.ReconcileBalanceRequeueFailed,
                {
                    error: error.message,
                }
            )
        }
    }

    @Interval(envConfig().executor.runtime.operation.reconcileBalance.requeue.interval)
    handleInterval() {
        this.process()
    }


}