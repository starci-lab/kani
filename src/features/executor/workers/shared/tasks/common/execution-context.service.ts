import {
    BotSchema, 
    InjectPrimaryMongoose, 
    JobSchema,
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    Connection 
} from "mongoose"
import {
    LoadExecutionContextParams,
    LoadExecutionContextResult,
} from "../types"
import {
    BotNotFoundException,
    JobNotFoundException,
} from "@modules/exceptions"

/**
 * Service responsible for building the execution context for a given job, bot, and liquidity pool.
 */
@Injectable()
export class ExecutionContextService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    /**
     * Builds the execution context for a given job, bot, and liquidity pool.
     * @param params - The parameters for the execution context loading.
     * @returns The execution context.
     */
    async load(
        {
            jobId,
            botId,
        }: LoadExecutionContextParams
    ): Promise<LoadExecutionContextResult> {
        // Find the job by id.
        const jobRaw = await this.connection
            .model<JobSchema>(JobSchema.name)
            .findById(jobId)
        if (!jobRaw) {
            throw new JobNotFoundException({
                jobId,
            })
        }
        const job = jobRaw.toJSON()
        // Find the state by job id.
        const botRaw = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!botRaw) {
            throw new BotNotFoundException({
                id: botId,
            })
        }
        const bot = botRaw.toJSON()
        return {
            job,
            bot,
        }
    }
}