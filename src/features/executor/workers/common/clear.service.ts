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
} from "../../bussiness"
import type {
    ClearServiceParams
} from "./types"
import {
    DayjsService,
} from "@modules/mixin"
import {
    envConfig,
} from "@modules/env"

/**
 * Service for clearing the bot's `activeJob` and releasing the lock authority.
 */
@Injectable()
export class ClearService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Clears the bot's `activeJob` and releases the lock authority.
     * 
     * Used in scenarios where only `botId` is available (e.g., timeout cleanup).
     * 
     * Note: Does not update job status or log completion details.
     * 
     * @param param.botId - Bot ID
     * @param param.jobId - Job ID
     */
    async process({ botId, jobId }: ClearServiceParams): Promise<void> {
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
                // clear the job by updating the job status to completed
                await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                    {
                        _id: jobId,
                    },
                    {
                        $set: {
                            status: JobStatus.Cleared,
                            processedAt: this.dayjsService.now().toDate(),
                            ...(envConfig().executor.workers.job.level === 1 ? {
                                $unset: {
                                    data: null,
                                },
                            } : undefined),
                        },
                    },
                    {
                        session,
                    }
                )
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