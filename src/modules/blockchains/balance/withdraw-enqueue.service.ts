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
} from "@modules/databases"
import {
    WithdrawPayload
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
    IWithdrawEnqueueService
} from "./types"

@Injectable()
export class WithdrawEnqueueService implements IWithdrawEnqueueService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectQueue(bullData[BullQueueName.Withdraw].name)
        private readonly withdrawQueue: Queue<string>,
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
            payload: cacheResult,
        }: EnqueueWithdrawParams,
    ): Promise<Job<string>> {
        const payload: WithdrawPayload = {
            jobId,
            botId: bot.id,
            isRetry,
            payload: cacheResult,
        }
        const payloadString = this.superJson.stringify(payload)
        if (!isRetry) {
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
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
                                        payload: payloadString,
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
        return await this.withdrawQueue.add(
            v4(),
            payloadString,
            {
                jobId: bot.id,
            }
        )
    }
}
