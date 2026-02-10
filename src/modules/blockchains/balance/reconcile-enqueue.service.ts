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
} from "@modules/databases"
import {
    ReconcileBalancePayload
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
    v4
} from "uuid"
import {
    IReconcileBalanceEnqueueService
} from "./types"

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
        @InjectQueue(bullData[BullQueueName.ReconcileBalance].name)
        private readonly reconcileBalanceQueue: Queue<string>,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly dayjsService: DayjsService,
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
    async enqueue({ bot, jobId, isRetry }: EnqueueReconcileBalanceParams): Promise<Job<string>> {
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
                                type: JobType.ReconcileBalance,
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
        const payload: ReconcileBalancePayload = {
            jobId,
            botId: bot.id,
            isRetry,
        }
        return await this.reconcileBalanceQueue.add(
            v4(),
            this.superJson.stringify(payload),
            {
                jobId: bot.id,
            }
        )
    }
}
