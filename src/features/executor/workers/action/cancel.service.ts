import {
    Injectable,
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    JobSchema,
    JobStatus,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    LockAuthorityService,
} from "@modules/lock"
import type {
    CancelParams
} from "./types"
import {
    DayjsService,
} from "@modules/mixin"
import {
    envConfig,
} from "@modules/env"

/**
 * Service for cancelling the job and releasing the lock authority.
 */
@Injectable()
export class CancelService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Cancels the job and releases the lock authority.
     * 
     * Used in scenarios where only `botId` is available (e.g., timeout cleanup).
     * 
     * Note: Does not update job status or log completion details.
     * 
     * @param param.botId - Bot ID
     * @param param.jobId - Job ID
     */
    async process(
        { 
            botId, 
            jobId 
        }: CancelParams): Promise<void> {
        const session = await this.connection.startSession()
        // update the bot to clear the active job
        await session.withTransaction(
            async () => {
                await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                    {
                        _id: botId,
                    },
                    {
                        $unset: {
                            activeJob: "",
                        },
                    },
                    {
                        session,
                    }
                )
                // if the job level is 2, delete the job
                if (envConfig().executor.workers.job.level === 2) {
                    await this.connection.model<JobSchema>(JobSchema.name).deleteOne(
                        {
                            _id: jobId,
                        },
                    )
                } else {
                // clear the job by updating the job status to completed
                    await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                        {
                            _id: jobId,
                        },
                        {
                            $set: {
                                status: JobStatus.Completed,
                                processedAt: this.dayjsService.now().toDate(),
                                ...(envConfig().executor.workers.job.level === 1 ? {
                                    $unset: {
                                        tasks: "",
                                    },
                                } : undefined
                                ),
                            },
                        },
                        {
                            session,
                        }
                    )
                }
            }
        )
        // release the lock authority
        this.lockAuthorityService.release(
            {
                botId,
            }
        )
    }
}