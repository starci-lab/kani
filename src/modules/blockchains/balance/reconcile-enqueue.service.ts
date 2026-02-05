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

    async enqueue(
        {
            bot,
            jobId,
            isRetry,
        }: EnqueueReconcileBalanceParams,
    ): Promise<Job<string>> {
        /**
         * Add reconcile balance job to the queue
         */
        if (!isRetry) {
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                    /**
                 * Persist job record.
                 */
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
                    /**
                    * Update the bot with the active job id.
                    */
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
        /**
        * Enqueue reconcile balance job.
        */
        const payload: ReconcileBalancePayload = {
            jobId,
            botId: bot.id,
            isRetry,
        }
        return await this.reconcileBalanceQueue.add(
            v4(),
            this.superJson.stringify(
                payload
            ),
            {
                jobId: bot.id,
            }
        )
    }
}
