import {
    BotSchema, 
    InjectPrimaryMongoose, 
    JobSchema,
    ActivePositionAssociateService
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    Connection 
} from "mongoose"
import {
    BotNotFoundException,
    JobNotFoundException,
} from "@modules/exceptions"
import {
    LoadJobContextParams, LoadJobContextResult 
} from "./types"

/**
 * Service responsible for building the execution context for a given job, bot, and liquidity pool.
 */
@Injectable()
export class JobContextService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly activePositionAssociateService: ActivePositionAssociateService,
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
        }: LoadJobContextParams
    ): Promise<LoadJobContextResult> {
        // Find the job by id.
        const job = await this.connection
            .model<JobSchema>(JobSchema.name)
            .findById(jobId)
        if (!job) {
            throw new JobNotFoundException({
                jobId,
            })
        }
        // Find the state by job id.
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!bot) {
            throw new BotNotFoundException({
                id: botId,
            })
        }
        // Convert the job and bot to JSON.
        const jobJson = job.toJSON()
        const botJson = bot.toJSON()
        // Associate the active position to the bot.
        await this.activePositionAssociateService.attachAssociatedLiquidityPoolToBotActivePositions(
            {
                bots: [botJson],
            }
        )
        await this.activePositionAssociateService.attachAssociatedPositionsToBotActivePositions(
            {
                bots: [botJson],
            }
        )
        return {
            job: jobJson,
            bot: botJson,
        }
    }
}