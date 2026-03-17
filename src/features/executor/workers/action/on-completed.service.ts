import {
    Injectable
} from "@nestjs/common"
import {
    BotSchema,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    JobType,
} from "@modules/databases"
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
} from "@modules/lock"
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
     * Completion handler for worker job processing.
     *
     * Marks the job COMPLETED, clears the bot's `activeJob`, logs completion,
     * and releases the lock authority. For Withdraw, also clears the withdraw cache.
     *
     * @param param - Params including job, bot, and payload
     */
    async process(
        {
            job,
            bot,
            payload,
        }: OnCompletedParams
    ): Promise<void> {
        // clear the withdraw cache if the job is a withdraw job
        if (payload.jobType === JobType.Withdraw) {
            await this.cacheService.del(
                {
                    key: CacheKey.Withdraw,
                    args: [bot.id],
                }
            )
        }
        // start a transaction to update the job status and clear the bot's active job
        const session = await this.connection.startSession()
        // update the job status and clear the bot's active job
        await session.withTransaction(
            async () => {
                // if the job level is 2, delete the job
                if (envConfig().executor.workers.job.level === 2) {
                    await this.connection.model<JobSchema>(JobSchema.name).deleteOne(
                        {
                            _id: job.id 
                        },
                    )
                } else {
                    // if the job level is 1, update the job status and clear the bot's active job
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
                                        tasks: "",
                                    },
                                } : undefined),
                            },
                        },
                        {
                            session 
                        },
                    )
                }
                // clear the bot's active job
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
        // log the action job completed
        this.winstonService.log(
            WinstonLog.ActionJobCompleted,
            {
                botId: bot.id,
                jobId: job.id,
                jobType: payload.jobType,
                metadata: job.metadata,
            }
        )
        // release the lock authority
        this.lockAuthorityService.release(
            {
                botId: bot.id 
            }
        )
    }
}
