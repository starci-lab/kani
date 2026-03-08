import {
    Injectable
} from "@nestjs/common"
import {
    EnqueueTransferFeesParams,
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
    ITransferFeesEnqueueService
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
 * Service responsible for enqueuing transfer fees jobs.
 * Handles job creation and queue management for transfer fees operations.
 *
 * @example
 * const service = new TransferFeesEnqueueService(...)
 * const job = await service.enqueue({ bot })
 */
@Injectable()
export class TransferFeesEnqueueService implements ITransferFeesEnqueueService {
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
     * Enqueues a transfer fees job.
     *
     * @param param - Parameters for enqueuing transfer fees job
     * @returns BullMQ job instance
     *
     * @example
     * const job = await service.enqueue({ bot })
     */
    async enqueue(
        params: EnqueueTransferFeesParams
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
                                    type: JobType.TransferFees,
                                    status: JobStatus.Running,
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
                                            jobType: JobType.TransferFees,
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
                type: JobType.TransferFees,
                jobId: jobId ?? "",
                botId: bot.id,
                isRetry,
                tasks: [
                    {
                        /** Transfer fees task */
                        type: TaskType.TransferFees,
                        payload: {
                            /** Payload for transfer fees task */
                            reconcile: false,
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
                        type: JobType.TransferFees,
                    }
                )
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeued,
                    {
                        botId: bot.id,
                        jobId: jobId ?? "",
                        type: JobType.TransferFees,
                    }
                )
            }
        } catch (error) {
            if (!isRetry) {
                this.winstonService.log(
                    WinstonLog.JobEnqueueFailed,
                    {
                        botId: bot.id,
                        type: JobType.TransferFees,
                        error: error.message,
                    }
                )
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeueFailed,
                    {
                        botId: bot.id,
                        jobId: oldJob?.id ?? "",
                        type: JobType.TransferFees,
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
     * Validate the transfer-fees job.
     * 
     * @param params - The parameters for validation
     * @returns True if the job is valid, false otherwise.
     */
    private async validate(
        {
            bot,
            oldJob,
            isRetry = false
        }: EnqueueTransferFeesParams
    ): Promise<boolean> {
        // Skip if bot do not have an active position
        if (!bot.activePosition && !isRetry) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotNotHasActivePosition,
                {
                    botId: bot.id,
                    type: JobType.TransferFees,
                }
            )
            return false
        }
        // Skip if bot position is not closed
        if (!bot.activePosition?.positionClosed && !isRetry) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotPositionNotClosed,
                {
                    botId: bot.id,
                    type: JobType.TransferFees,
                }
            )
            return false
        }
        // Skip if balance snapshot is within cooldown (avoid rescan too soon)
        if (bot.balanceSnapshots?.snapshotAt && !isRetry) {
            const diffMs = this.dayjsService.now().diff(
                this.dayjsService.from(bot.balanceSnapshots.snapshotAt),
                "millisecond"
            )
            if (diffMs > envConfig().executor.runtime.operation.reconcileBalance.cooldown.rescan) {
                this.winstonService.log(
                    WinstonLog.JobSkippedBotBalanceSnapshotNotWithinCooldown,
                    {
                        botId: bot.id,
                        type: JobType.TransferFees,
                        jobId: oldJob?.id,
                    }
                )
                return false
            }
        }

        // Skip if bot has an active job
        if (bot.activeJob && !isRetry) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAlreadyHasActiveJob,
                {
                    botId: bot.id,
                    jobId: bot.activeJob.job.toString(),
                    type: JobType.TransferFees,
                }
            )
            return false
        }
        // Wait to ensure no job for this bot is already in the queue
        const bullmqJob = await this.actionQueue.getJob(bot.id)
        if (bullmqJob) {
            this.winstonService.log(
                WinstonLog.JobSkippedFoundInQueue,
                {
                    botId: bot.id,
                    type: JobType.TransferFees,
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
                    type: JobType.TransferFees,
                    jobId: oldJob?.id,
                }
            )
            return false
        }
        return true
    }
}
