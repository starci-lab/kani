import {
    Injectable
} from "@nestjs/common"
import {
    OpenPositionTaskPrepareParams
} from "../types"
import {
    ActionExecutionContextService,
} from "../common"
import {
    OpenPositionActionService
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose, JobSchema,
    TaskType
} from "@modules/databases"
import {
    Connection
} from "mongoose"
/**
 * Service for the OPEN POSITION PREPARE step.
 */
@Injectable()
export class OpenPositionTaskPrepareService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
        private readonly actionExecutionContextService: ActionExecutionContextService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    /**
     * Process the OPEN POSITION TASK PREPARE step.
     *
     * @param params - The parameters for the step.
     * @returns The result of the step.
     */
    async process(
        {
            botId,
            jobId,
            liquidityPoolId,
            state,
            index,
        }: OpenPositionTaskPrepareParams
    ) {
        // Load the execution context.
        const {
            bot,
            liquidityPool,
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
        await this.connection.model<JobSchema>(
            JobSchema.name
        ).updateOne(
            {
                _id: {
                    $eq: jobId,
                },
            },
            {
                // Update the prepare result for the task.
                $set: {
                    "tasks.$[task].prepareResult": prepareResult,
                },
            },
            {
                // Update the task with the given index and type.
                arrayFilters: [
                    {
                        "task.index": index,
                        "task.type": TaskType.OpenPosition,
                    }
                ],
            },
        )
        return {
            prepareResult,
        }
    }
}