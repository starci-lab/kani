import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    JobType,
    TaskType,
} from "@modules/databases"
import {
    CannotClosePositionEnqueueJobReason,
    CannotEnqueueClosePositionJobException,
} from "@modules/exceptions"
import {
    Connection 
} from "mongoose"
import {
    envConfig 
} from "@modules/env"
import {
    ActionPayload 
} from "../../types"
import SuperJSON from "superjson"
import {
    DayjsService, InjectSuperJson 
} from "@modules/mixin"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    bullData, BullQueueName 
} from "@modules/bullmq"
import {
    Job,
    Queue 
} from "bullmq"
import {
    WinstonLog 
} from "@modules/winston"
import {
    WinstonService 
} from "@modules/winston"
import {
    EnqueueClosePositionParams
} from "./types"

/**
 * Service responsible for enqueuing close position jobs.
 * Validates preconditions and adds jobs to the queue.
 *
 * @example
 * const service = new ClosePositionEnqueueService(...)
 * const job = await service.enqueue({ bot, liquidityPool, jobId })
 */
@Injectable()
export class ClosePositionEnqueueService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectQueue(bullData[BullQueueName.Action].name)
        private readonly actionQueue: Queue<string>,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Enqueue a close position job.
     * 
     * Side effects:
     * - Persists the job record
     * - Enqueues the job in the queue
     */
    async enqueue(
        {
            liquidityPool,
            bot,
            jobId,
            isRetry,
        }: EnqueueClosePositionParams,
    ): Promise<Job<string>> {
        if (!isRetry) {
            // Persist job record + set bot activeJob + enqueue in one transaction (same pattern as open-position).
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                    const [jobRaw] = await this.connection.model<JobSchema>(
                        JobSchema.name
                    ).create(
                        [
                            {
                                _id: jobId,
                                liquidityPool: liquidityPool.id,
                                bot: bot.id,
                                executor: envConfig().executor.id,
                                type: JobType.ClosePosition,
                                status: JobStatus.Pending,
                            }
                        ],
                        {
                            session,
                        }
                    )
                    const job = jobRaw.toJSON<JobSchema>()
                    await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                        {
                            _id: bot.id,
                        },
                        {
                            $set: {
                                activeJob: {
                                    job: job.id,
                                    liquidityPool: liquidityPool.id,
                                    jobType: JobType.ClosePosition,
                                    queuedAt: this.dayjsService.now().toDate(),
                                },
                            },
                        },
                        {
                            session,
                        }
                    )
                }
            )
        } 
        // check if the job is already in the queue
        const jobInQueue = await this.actionQueue.getJob(bot.id)
        if (jobInQueue) {
            this.winstonService.log(
                WinstonLog.ClosePositionJobAlreadyEnqueued,
                {
                    jobId,
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            throw new CannotEnqueueClosePositionJobException(
                {
                    jobId,
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    reason: CannotClosePositionEnqueueJobReason.AlreadyInQueue,
                }
            )
        }   
        const payload: ActionPayload = {
            jobId,
            botId: bot.id,
            isRetry,
            tasks: [
                {
                    /** Close position task */
                    type: TaskType.ClosePosition,
                    payload: {
                        /** Payload for close position task */
                        liquidityPoolId: liquidityPool.id,
                    },
                },
                {
                    /** Reconcile balance task */
                    type: TaskType.ReconcileBalance,
                    payload: {
                        /** Payload for reconcile balance task */
                    },
                }
            ],
        }
        return await this.actionQueue.add(
            jobId,
            this.superjson.stringify(payload),
            {
                jobId: bot.id,
            }
        )
    }
}
