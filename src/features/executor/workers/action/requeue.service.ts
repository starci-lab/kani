
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
    Job,
    Queue
} from "bullmq"
import {
    BullQueueName, bullData
} from "@modules/bullmq"
import {
    AsyncService
} from "@modules/mixin"
import {
    ClosePositionEnqueueService,
    OpenPositionEnqueueService,
    ReconcileBalanceEnqueueService,
    WithdrawEnqueueService
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
import {
    JobContextService
} from "./context"

/**
 * Service for requeueing open-position jobs when active jobs exceed TTL.
 *
 * @example
 * const requeueService = app.get(RequeueService)
 * await requeueService.process()
 */
@Injectable()
export class ActionRequeueService implements OnApplicationBootstrap {
    constructor(
        @InjectQueue(bullData[BullQueueName.Action].name)
        private readonly actionQueue: Queue<string>,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly jobContextService: JobContextService,
        private readonly openPositionEnqueueService: OpenPositionEnqueueService,
        private readonly closePositionEnqueueService: ClosePositionEnqueueService,
        private readonly withdrawEnqueueService: WithdrawEnqueueService,
        private readonly reconcileBalanceEnqueueService: ReconcileBalanceEnqueueService,
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
                activeJob: {
                    $exists: true,
                    $ne: null,
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
                    const bullmqJob = await this.actionQueue.getJob(bot.id)
                    if (bullmqJob) {
                        this.winstonService.log(
                            WinstonLog.JobSkippedFoundInQueue,
                            {
                                botId: bot.id,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                type: bot.activeJob?.jobType ?? JobType.OpenPosition,
                                bullmqJobId: bullmqJob?.id ?? "",
                            }
                        )
                        return
                    }
                    const [context,
                        error] = await this.asyncService.resolveTuple(
                        this.jobContextService.load({
                            jobId: bot.activeJob?.job?.toString() ?? "",
                            botId: bot.id,
                        }
                        )
                    )
                    if (error || !context) {
                        this.winstonService.log(
                            WinstonLog.JobSkippedContextLoadFailed,
                            {
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                botId: bot.id,
                                type: bot.activeJob?.jobType ?? JobType.OpenPosition,
                                error: error?.message ?? "Unknown error",
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
                            WinstonLog.JobSkippedAuthorityNotAcquired,
                            {
                                botId: bot.id,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                type: bot.activeJob?.jobType ?? JobType.OpenPosition,
                            }
                        )
                        return
                    }
                    try {
                        let bullmqJob: Job<string> | undefined
                        switch (context.job.type) {
                        case JobType.OpenPosition: {
                            // ensure bot is running
                            if (!context.bot.running) {
                                this.winstonService.log(
                                    WinstonLog.JobSkippedBotNotRunning,
                                    {
                                        botId: bot.id,
                                        jobId: context.job.id,
                                        type: bot.activeJob?.jobType ?? JobType.OpenPosition,
                                    }
                                )
                                return
                            }
                            // ensure no active position found
                            if (context.bot.activePosition) {
                                this.winstonService.log(
                                    WinstonLog.JobSkippedBotAlreadyHasActivePosition,
                                    {
                                        botId: bot.id,
                                        jobId: context.job.id,
                                        type: bot.activeJob?.jobType ?? JobType.OpenPosition,
                                    }
                                )
                                return
                            }   
                            bullmqJob = await this.openPositionEnqueueService.enqueue(
                                {
                                    bot,
                                    liquidityPool,
                                    jobId: bot.activeJob?.job?.toString() ?? "",
                                    isRetry: true,
                                }
                            )
                            break
                        }
                        case JobType.ClosePosition: {
                            // ensure no active position found
                            if (!context.bot.activePosition) {
                                this.winstonService.log(
                                    WinstonLog.JobSkippedBotNotHasActivePosition,
                                    {
                                        botId: bot.id,
                                        jobId: context.job.id,
                                        type: bot.activeJob?.jobType ?? JobType.ClosePosition,
                                    }
                                )
                                return
                            }
                            bullmqJob = await this.closePositionEnqueueService.enqueue(
                                {
                                    bot: context.bot,
                                    liquidityPool,
                                    jobId: bot.activeJob?.job?.toString() ?? "",
                                    isRetry: true,
                                }
                            )
                            break
                        }
                        case JobType.Withdraw: {
                            bullmqJob = await this.withdrawEnqueueService.enqueue(
                                {
                                    bot: context.bot,
                                    jobId: bot.activeJob?.job?.toString() ?? "",
                                    isRetry: true,
                                }
                            )
                            break
                        }
                        case JobType.ReconcileBalance: {
                            // ensure bot is running
                            if (!context.bot.running) {
                                this.winstonService.log(
                                    WinstonLog.JobSkippedBotNotRunning,
                                    {
                                        botId: bot.id,
                                        jobId: context.job.id,
                                        type: bot.activeJob?.jobType ?? JobType.ReconcileBalance,
                                    }
                                )
                                return
                            }
                            bullmqJob = await this.reconcileBalanceEnqueueService.enqueue(
                                {
                                    bot: context.bot,
                                    jobId: bot.activeJob?.job?.toString() ?? "",
                                    isRetry: true,
                                }
                            )
                        }
                        }
                        this.winstonService.log(
                            WinstonLog.JobRequeued,
                            {
                                jobId: context.job.id,
                                botId: bot.id,
                                type: context.job.type,
                                metadata: context.job.metadata,
                                bullmqJobId: bullmqJob?.id ?? "",
                            }
                        )
                    } catch (error) {
                        this.winstonService.log(
                            WinstonLog.JobRequeueFailed,
                            {
                                botId: bot.id,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                type: bot.activeJob?.jobType ?? JobType.OpenPosition,
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
