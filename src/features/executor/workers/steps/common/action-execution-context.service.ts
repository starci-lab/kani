import {
    BotSchema, 
    InjectPrimaryMongoose, 
    JobSchema, 
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    Connection 
} from "mongoose"
import {
    LoadActionExecutionContextParams,
    LoadActionExecutionContextResult,
} from "../types"
import {
    BotNotFoundException,
    JobNotFoundException,
    LiquidityPoolNotFoundException,
} from "@modules/exceptions"
import {
    LiquidityPoolStateService 
} from "@modules/blockchains"

/**
 * Service responsible for building the execution context for a given job, bot, and liquidity pool.
 */
@Injectable()
export class ActionExecutionContextService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
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
            liquidityPoolId,
        }: LoadActionExecutionContextParams
    ): Promise<LoadActionExecutionContextResult> {
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
        // Find the liquidity pool by id.
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
            id: {
                $eq: liquidityPoolId,
            }
        })
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(
                {
                    id: liquidityPoolId,
                }
            )
        }
        // Get the state
        const state = await this.liquidityPoolStateService.getState(liquidityPool)
        return {
            job,
            bot,
            liquidityPool,
            state,
        }
    }
}