import {
    Injectable
} from "@nestjs/common"
import {
    EnqueueWithdrawParams
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
    Connection,
    Types
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
    IWithdrawEnqueueService
} from "./types"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    LockAuthorityService 
} from "@modules/lock"

/**
 * Service responsible for enqueuing withdraw jobs.
 * Handles job creation and queue management for withdraw operations.
 *
 * @example
 * const service = new WithdrawEnqueueService(...)
 * const job = await service.enqueue({ bot, jobId, payload })
 */
@Injectable()
export class WithdrawEnqueueService implements IWithdrawEnqueueService {
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
     * Enqueues a withdraw job.
     *
     * @param param - Parameters for enqueuing withdraw job
     * @returns BullMQ job instance
     *
     * @example
     * const job = await service.enqueue({ bot, jobId, payload })
     */
    async enqueue(
        params: EnqueueWithdrawParams
    ) {
        const { bot, isRetry, oldJob } = params
        if (!await this.validate(params)) {
            return
        }
        try {
            let jobId = oldJob?.id
            // create job record if not a retry
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
                                    type: JobType.Withdraw,
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
                                            jobType: JobType.Withdraw,
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
            // build withdraw payload
            const payload: ActionPayload = {
                type: JobType.Withdraw,
                jobId: jobId ?? "",
                botId: bot.id,
                isRetry,
                tasks: [
                    {
                    /** Withdraw task */
                        type: TaskType.Withdraw,
                        /** Payload for withdraw task */
                        payload: {
                        },
                    },
                ],
            }
            // enqueue job to queue
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
                        type: JobType.Withdraw,
                    }
                )
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeued,
                    {
                        botId: bot.id,
                        jobId: jobId ?? "",
                        type: JobType.Withdraw,
                    }
                )
            }
        } catch (error) {
            if (!isRetry) {
                this.winstonService.log(
                    WinstonLog.JobEnqueueFailed,
                    {
                        botId: bot.id,
                        error: error.message,
                        type: JobType.Withdraw,
                    }
                )
            } else {
                this.winstonService.log(
                    WinstonLog.JobRequeueFailed,
                    {
                        botId: bot.id,
                        jobId: oldJob?.id ?? "",
                        type: JobType.Withdraw,
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
     * Validate the withdraw job.
     * 
     * @param bot - The bot.
     * @returns True if the job is valid, false otherwise.
     */
    private async validate(
        { bot }: EnqueueWithdrawParams
    ): Promise<boolean> {
        // Skip if bot is not running
        if (!bot.running) {
            this.winstonService.log(WinstonLog.JobSkippedBotNotRunning,
                {
                    botId: bot.id,
                    type: JobType.Withdraw,
                })
            return false
        }
      
        // Skip if bot has an active position
        if (bot.activePosition) {
            this.winstonService.log(WinstonLog.JobSkippedBotAlreadyHasActivePosition,
                {
                    botId: bot.id,
                    type: JobType.Withdraw,
                })
            return false
        }
      
        // Skip if bot already has an active job
        if (bot.activeJob) {
            this.winstonService.log(WinstonLog.JobSkippedBotAlreadyHasActiveJob,
                {
                    botId: bot.id,
                    jobId: bot.activeJob.job.toString(),
                    type: JobType.Withdraw,
                })
            return false
        }
      
        // Skip if a job already exists in the queue for this bot (Bull jobId = bot.id)
        const existingBullJob = await this.actionQueue.getJob(bot.id)
        if (existingBullJob) {
            this.winstonService.log(WinstonLog.JobSkippedFoundInQueue,
                {
                    botId: bot.id,
                    bullmqJobId: existingBullJob.id ?? "",
                    type: JobType.Withdraw,
                })
            return false
        }
      
        // Acquire lock authority to prevent concurrent scheduling
        const acquired = await this.lockAuthorityService.acquire({
            botId: bot.id,
        })
        if (!acquired) {
            this.winstonService.log(
                WinstonLog.JobSkippedBotAuthorityNotAcquired,
                {
                    botId: bot.id,
                    type: JobType.Withdraw,
                })
            return false
        }
      
        return true
    }
}
