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
import {
    AsyncService 
} from "@modules/mixin"

/**
 * Service responsible for building the execution context for a given job, bot, and liquidity pool.
 */
@Injectable()
export class JobContextService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly activePositionAssociateService: ActivePositionAssociateService,
        private readonly asyncService: AsyncService,
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
        const [
            job,
            bot
        ] = await this.asyncService.allMustDone(
            [
                this.connection
                    .model<JobSchema>(JobSchema.name)
                    .findById(jobId),
                this.connection
                    .model<BotSchema>(BotSchema.name)
                    .findById(botId),
            ]
        )
        if (!job) {
            throw new JobNotFoundException({
                jobId,
            })
        }
        if (!bot) {
            throw new BotNotFoundException({
                id: botId,
            })
        }
        // Convert the job and bot to JSON.
        const jobJson = job.toJSON()
        const botJson = bot.toJSON()
        // Associate the active position to the bot.
        await this.asyncService.allMustDone(
            [
                this.activePositionAssociateService.attachAssociatedLiquidityPoolToBotActivePositions(
                    {
                        bots: [botJson],
                    }
                ),
                this.activePositionAssociateService.attachAssociatedPositionsToBotActivePositions(
                    {
                        bots: [botJson],
                    }
                ),
            ]
        )
        return {
            job: jobJson,
            bot: botJson,
        }
    }
}