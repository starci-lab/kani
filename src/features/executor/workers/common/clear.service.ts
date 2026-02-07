import {
    Injectable,
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    JobSchema,
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

/**
 * Service for clearing the bot's `activeJob` and releasing the lock authority.
 */
@Injectable()
export class ClearService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly lockAuthorityService: LockAuthorityService,
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
                            activeJob: null,
                        },
                    },
                    {
                        session,
                    }
                )
                // clear the job
                await this.connection.model<JobSchema>(JobSchema.name).deleteOne(
                    {
                        _id: jobId,
                    },
                    {
                        session,
                    }
                )
            }
        )
        // release the lock authority
        await this.lockAuthorityService.release(
            {
                botId,
            }
        )
    }
}