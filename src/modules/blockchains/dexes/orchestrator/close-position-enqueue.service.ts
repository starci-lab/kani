import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    JobType,
    LiquidityPoolSchema,
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
    v4 
} from "uuid"
import {
    ClosePositionPayload 
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
    DynamicLiquidityPoolInfoCacheResult 
} from "@modules/cache"

export interface EnqueueClosePositionParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    jobId: string
    isRetry?: boolean
    dynamicLiquidityPoolInfo?: DynamicLiquidityPoolInfoCacheResult
}

@Injectable()
export class ClosePositionEnqueueService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectQueue(bullData[BullQueueName.ClosePosition].name)
        private readonly closePositionQueue: Queue<string>,
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
            dynamicLiquidityPoolInfo,
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
        const jobInQueue = await this.closePositionQueue.getJob(bot.id)
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
        const payload: ClosePositionPayload = {
            jobId,
            botId: bot.id,
            liquidityPoolId: liquidityPool.id,
            isRetry,
            dynamicLiquidityPoolInfo,
        }
        return await this.closePositionQueue.add(
            v4(),
            this.superjson.stringify(payload),
            {
                jobId: bot.id,
            }
        )
    }
}
