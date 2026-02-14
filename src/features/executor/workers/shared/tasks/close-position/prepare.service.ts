import {
    Injectable
} from "@nestjs/common"
import {
    InjectPrimaryMongoose, JobSchema,
    StepType,
    TaskType
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    ClosePositionTaskPrepareParams 
} from "../types"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    OpenPositionActionService 
} from "@modules/blockchains"
/**
 * Service for the Close Position Task PREPARE step.
 */
@Injectable()
export class ClosePositionTaskPrepareService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) { }

    /**
     * Process the Close Position Task PREPARE step.
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
            taskIndex,
        }: ClosePositionTaskPrepareParams
    ) {
        // Load the execution context.
        const {
            bot,
            liquidityPool,
            state: _state,
        } = await this.actionExecutionContextService.load(
            {
                botId,
                jobId,
                liquidityPoolId,
                state,
            }
        )
        // We need validation here
        // Thus, we need to prepare
        const prepareResult =
            await this.openPositionActionService.prepare(
                {
                    bot,
                    state: _state,
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
                    "tasks.$[task].prepareResult": this.superJson.stringify(prepareResult),
                    "tasks.$[task].activeStep": 0,
                    "tasks.$[task].steps": prepareResult.prepareTxs.map(
                        (prepareTx) => (
                            {
                                type: StepType.Sign,
                                signParams: prepareTx.serializedTx,
                            }
                        )
                    ),
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
    }
}