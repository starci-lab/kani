import {
    Injectable
} from "@nestjs/common"
import {
    EnqueueReconcileBalanceParams,
} from "./types"
import {
    JobType,
    JobStatus,
    InjectPrimaryMongoose,
    JobSchema,
    BotSchema,
    TaskType,
} from "@modules/databases"
import {
    ActionPayload
} from "../types"
import {
    envConfig
} from "@modules/env"
import {
    Connection
} from "mongoose"
import {
    Queue
} from "bullmq"
import {
    bullData, BullQueueName
} from "@modules/bullmq"
import {
    InjectQueue
} from "@nestjs/bullmq"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    DayjsService
} from "@modules/mixin"
import {
    IReconcileBalanceEnqueueService
} from "./types"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    LockAuthorityService 
} from "@modules/lock"
import {
    Types
} from "mongoose"

/**
 * Service responsible for enqueuing reconcile balance jobs.
 * Handles job creation and queue management for reconcile balance operations.
 *
 * @example
 * const service = new ReconcileBalanceEnqueueService(...)
 * const job = await service.enqueue({ bot, jobId })
 */
@Injectable()
export class ReconcileBalanceEnqueueService implements IReconcileBalanceEnqueueService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectQueue(bullData[BullQueueName.Action].name)
        private readonly actionQueue: Queue<string>,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly lockAuthorityService: LockAuthorityService,
    ) {
    }

    /**
     * Enqueues a reconcile balance job.
     *
     * @param param - Parameters for enqueuing reconcile balance job
     * @returns BullMQ job instance
     *
     * @example
     * const job = await service.enqueue({ bot, jobId })
     */
    async enqueue(
        params: EnqueueReconcileBalanceParams
    ) {
        const { bot, oldJob, isRetry } = params
        if (!await this.validate(params)) {
            return
        }
        // create job record if not a retry
        let jobId = oldJob?.id
        try {
            if (!isRetry) {
                jobId = new Types.ObjectId().toString()
                const session = await this.connection.startSession()
                await session.withTransaction(
                    async () => {
                    // persist job record in database
                        const [jobRaw] = await this.connection.model<JobSchema>(
                            JobSchema.name
                        ).create(
                            [
                                {
                                    _id: jobId,
                                    bot: bot.id,
                                    type: JobType.ReconcileBalance,
                                    status: JobStatus.Pending,
                                    executor: envConfig().executor.id,
                                    startedAt: this.dayjsService.now().toDate(),
                                    tasks: [
                                    ],
                                }
                            ],
                            {
                                session
                            })
                        const job = jobRaw.toJSON<JobSchema>()
                        // update bot with active job reference
                        await this.connection.model<BotSchema>(BotSchema.name)
                            .updateOne(
                                {
                                    _id: bot.id
                                },
                                {
                                    $set: {
                                        activeJob: {
                                            job: job.id,
                                            queuedAt: this.dayjsService.now().toDate(),
                                            jobType: JobType.ReconcileBalance,
                                        },
                                    }
                                },
                                {
                                    session
                                }
                            )
                    }
                )
            }
        
            // build payload and enqueue job
            const payload: ActionPayload = {
                type: JobType.ReconcileBalance,
                jobId: jobId ?? "",
                botId: bot.id,
                isRetry,
                tasks: [
                    {
                    /** Reconcile balance task */
                        type: TaskType.ReconcileBalance,
                        payload: {
                        /** Payload for reconcile balance task */
                            noSwap: false,
                        },
                    },
                ],
            }
            await this.actionQueue.add(
                bot.id,
                this.superJson.stringify(payload),
                {
                    jobId: bot.id,
                }
            )
            if (!isRetry) {
                this.winstonService.log(
                    WinstonLog.JobEnqueued,
                    {
                        botId: bot.id,
                        jobId: jobId ?? "",
                        type: JobType.ReconcileBalance,
                    }
                )
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeued,
                    {
                        botId: bot.id,
                        jobId: jobId ?? "",
                        type: JobType.ReconcileBalance,
                    }
                )
            }
        } catch (error) {
            if (!isRetry) {
                this.winstonService.log(
                    WinstonLog.JobEnqueueFailed,
                    {
                        botId: bot.id,
                        type: JobType.ReconcileBalance,
                        error: error.message,
                    }
                )
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeueFailed,
                    {
                        botId: bot.id,
                        jobId: oldJob?.id ?? "",
                        type: JobType.ReconcileBalance,
                        error: error.message,
                    }
                )
            }
            this.lockAuthorityService.release(
                {
                    botId: bot.id,
                }
            )
        }
    }

    /**
     * Validate the reconcile-balance job.
     * 
     * @param bot - The bot.
     * @param oldJob - The old job.
     * @returns True if the job is valid, false otherwise.
     */
    private async validate(
        {
            bot,
            oldJob,
        }: EnqueueReconcileBalanceParams
    ): Promise<boolean> {
        // Skip if bot is not running
        if (!bot.running) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotNotRunning,
                {
                    botId: bot.id,
                    type: JobType.ReconcileBalance,
                    jobId: oldJob?.id,
                }
            )
            return false
        }
        // Skip if bot has an active position
        if (bot.activePosition) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAlreadyHasActivePosition,
                {
                    botId: bot.id,
                    type: JobType.ReconcileBalance,
                    jobId: oldJob?.id,
                }
            )
            return false
        }
        // Skip if balance snapshot is within cooldown (avoid rescan too soon)
        if (bot.balanceSnapshots?.snapshotAt) {
            const diffMs = this.dayjsService.now().diff(
                this.dayjsService.from(bot.balanceSnapshots.snapshotAt),
                "millisecond"
            )
            if (diffMs <= envConfig().executor.runtime.operation.reconcileBalance.cooldown.rescan) {
                this.winstonService.log(
                    WinstonLog.JobSkippedBotBalanceSnapshotWithinCooldown,
                    {
                        botId: bot.id,
                        type: JobType.ReconcileBalance,
                        jobId: oldJob?.id,
                    }
                )
                return false
            }
        }
        // Wait to ensure no job for this bot is already in the queue
        const bullmqJob = await this.actionQueue.getJob(bot.id)
        if (bullmqJob) {
            this.winstonService.log(
                WinstonLog.JobSkippedFoundInQueue,
                {
                    botId: bot.id,
                    type: JobType.ReconcileBalance,
                    bullmqJobId: bullmqJob.id ?? "",
                    jobId: oldJob?.id,
                }
            )
            return false
        }
        // Acquire lock authority; return if not acquired
        const acquired = await this.lockAuthorityService.acquire(
            {
                botId: bot.id,
            }
        )
        if (!acquired) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAuthorityNotAcquired,
                {
                    botId: bot.id,
                    type: JobType.ReconcileBalance,
                    jobId: oldJob?.id,
                }
            )
            return false
        }
        return true
    }
}
