import {
    Injectable
} from "@nestjs/common"
import {
    OpenPositionPrepareStepParams
} from "../types"
import {
    ActionExecutionContextService,
} from "../common"
import {
    OpenPositionActionService
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose, JobSchema, 
    JobStatus
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
/**
 * Service for the OPEN POSITION PREPARE step.
 */
@Injectable()
export class OpenPositionPrepareStepService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
        private readonly actionExecutionContextService: ActionExecutionContextService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection, 
    ) { }
    /**
     * Process the OPEN POSITION PREPARE step.
     *
     * @param params - The parameters for the step.
     * @returns The result of the step.
     */
    async process(
        {
            botId,
            jobId,
            liquidityPoolId,
        }: OpenPositionPrepareStepParams
    ) {
        // Load the execution context.
        const {
            bot,
            liquidityPool,
            state,
        } = await this.actionExecutionContextService.load(
            {
                botId,
                jobId,
                liquidityPoolId,
            }
        )
        // We need validation here
        // Thus, we need to prepare
        const prepareResult =
            await this.openPositionActionService.prepare(
                {
                    bot,
                    state,
                    liquidityPool,
                }
            )
        // We update the database with the prepare result.
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: {
                    $eq: jobId,
                },
                status: {
                    $eq: JobStatus.Pending,
                },
            },
        )
        return {
            prepareResult,
        }
    }
}