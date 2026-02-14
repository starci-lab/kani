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
    JobVariant,
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
    Job,
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
    async enqueue({ bot, jobId, isRetry, payload: cacheResult }: EnqueueWithdrawParams): Promise<Job<string>> {
        // build withdraw payload
        const payload: ActionPayload = {
            variant: JobVariant.Withdraw,
            jobId,
            botId: bot.id,
            isRetry,
            tasks: [
                {
                    /** Withdraw task */
                    type: TaskType.Withdraw,
                    /** Payload for withdraw task */
                    payload: cacheResult,
                },
            ],
        }
        
        // create job record if not a retry
        if (!isRetry) {
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
        
        // enqueue job to queue
        return await this.actionQueue.add(
            jobId,
            this.superJson.stringify(payload),
            {
                jobId: bot.id,
            }
        )
    }
}
