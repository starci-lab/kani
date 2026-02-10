import {
    Injectable
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    JobSchema,
    JobStatus,
} from "@modules/databases"
import {
    BullQueueName
} from "@modules/bullmq"
import {
    DayjsService,
} from "@modules/mixin"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    Connection,
} from "mongoose"
import {
    LockAuthorityService,
} from "../../bussiness"
import type {
    OnCompletedParams,
} from "./types"
import {
    envConfig
} from "@modules/env"
import {
    CacheKey,
    CacheService,
} from "@modules/cache"

/**
 * Service for handling job completion.
 */
@Injectable()
export class OnCompletedService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
        private readonly cacheService: CacheService,
    ) {}

    /**
     * Get the Winston log event for a given queue name.
     * 
     * @param queueName - The name of the queue.
     * @returns The Winston log event.
     */ 
    private queueToLog(queueName: BullQueueName): WinstonLog {
        const queueToLog: Record<BullQueueName, WinstonLog> = {
            [BullQueueName.OpenPosition]: WinstonLog.OpenPositionJobCompleted,
            [BullQueueName.ClosePosition]: WinstonLog.ClosePositionJobCompleted,
            [BullQueueName.ReconcileBalance]: WinstonLog.ReconcileBalanceJobCompleted,
            [BullQueueName.Withdraw]: WinstonLog.WithdrawJobCompleted,
        }
        return queueToLog[queueName]
    }

    /**
     * Completion handler for worker job processing.
     *
     * Marks the job COMPLETED, clears the bot's `activeJob`, logs completion,
     * and releases the lock authority. For Withdraw, also clears the withdraw cache.
     *
     * @param param - Params including job, bot, bullmqJob, queueName, and optional liquidityPool
     */
    async process({
        job,
        bot,
        bullmqJob,
        queueName,
        liquidityPool,
    }: OnCompletedParams): Promise<void> {
        if (queueName === BullQueueName.Withdraw) {
            await this.cacheService.del({
                key: CacheKey.Withdraw,
                args: [bot.id],
            })
        }
        const session = await this.connection.startSession()
        await session.withTransaction(
            async () => {
                if (envConfig().executor.workers.job.level === 2) {
                    await this.connection.model<JobSchema>(JobSchema.name).deleteOne(
                        {
                            _id: job.id 
                        },
                    )
                } else {
                    await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                        {
                            _id: job.id 
                        },
                        {
                            $set: {
                                status: JobStatus.Completed,
                                processedAt: this.dayjsService.now().toDate(),
                                ...(envConfig().executor.workers.job.level === 1 ? {
                                    $unset: {
                                        data: null 
                                    },
                                } : undefined),
                            },
                        },
                        {
                            session 
                        },
                    )
                }
                await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                    {
                        _id: bot.id 
                    },
                    {
                        $unset: {
                            activeJob: "", 
                        } 
                    },
                    {
                        session 
                    },
                )
            },
        )
        
        const logEvent = this.queueToLog(queueName)
        const logPayload: Record<string, unknown> = {
            botId: bot.id,
            jobId: job.id,
            bullmqJobId: bullmqJob.id,
        }
        if (liquidityPool) {
            logPayload.liquidityPoolId = liquidityPool.displayId
        }
        this.winstonService.log(logEvent,
            logPayload)
        this.lockAuthorityService.release(
            {
                botId: bot.id 
            }
        )
    }
}
