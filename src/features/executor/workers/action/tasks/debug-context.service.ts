import {
    JobType 
} from "@modules/databases"
import {
    DebugLatencyService 
} from "@modules/debug"
import {
    Injectable 
} from "@nestjs/common"

/**
 * Service for generating debug context IDs.
 */
@Injectable()
export class DebugContextService {
    constructor(
        private readonly debugLatencyService: DebugLatencyService,
    ) {}

    /**
     * Create a debug context payload.
     * @param params - The parameters for creating the context.
     * @param params.jobType - The type of the job.
     * @param params.jobId - The ID of the job.
     * @param params.botId - The ID of the bot.
     * @returns The parameters for creating the context.
     */
    createContextPayload(
        { jobType, jobId, botId }: CreateContextPayloadParams
    ): CreateContextPayloadResult {
        // map of job type to name
        const nameMap: Record<JobType, string> = {
            [JobType.ReconcileBalance]: "Reconcile Balance",
            [JobType.ClosePosition]: "Close Position",
            [JobType.OpenPosition]: "Open Position",
            [JobType.Withdraw]: "Withdraw",
            [JobType.TransferFees]: "Transfer Fees",
        }
        // create the id and name
        return {
            // the id is the job type, job id, and bot id
            id: `${jobType}:${jobId}:${botId}`,
            // the name is the job type, job id, and bot id
            name: `${nameMap[jobType]} | Job ${jobId} | Bot ${botId}`,
        }
    }
}

/** Params for creating a debug context. */
export interface CreateContextPayloadParams {
    /** The type of the job. */
    jobType: JobType
    /** The ID of the job. */
    jobId: string
    /** The ID of the bot. */
    botId: string
}

export interface CreateContextPayloadResult {
    /** The ID of the context. */
    id: string
    /** The name of the context. */
    name: string
}