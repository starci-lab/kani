import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionActionService, 
    SignedTx
} from "@modules/blockchains"
import {
    ActionExecutionContextService 
} from "../common"
import {
    ClosePositionTaskExecuteParams,
} from "../types"
import {
    InjectPrimaryMongoose,
    JobSchema, 
    StepType, 
    TaskType 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    SignResultNotFoundException 
} from "@modules/exceptions"

/**
 * Service for the Close Position Task EXECUTE step.
 */
@Injectable()
export class ClosePositionTaskExecuteService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        private readonly actionExecutionContextService: ActionExecutionContextService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) { }
    
    /**
     * Process the CLOSE POSITION TASK EXECUTE step.
     * @param params - The parameters for the CLOSE POSITION TASK EXECUTE step.
     * @param params.botId - The ID of the bot.
     * @param params.jobId - The ID of the job.
     * @param params.liquidityPoolId - The ID of the liquidity pool.
     * @param params.state - The state of the liquidity pool.
     * @param params.isRetry - Whether the task is being retried.
     * @param params.taskIndex - The index of the task.
     * @param params.stepIndex - The index of the step.
     */
    async process({
        botId,
        jobId,
        liquidityPoolId,
        state,
        isRetry,
        taskIndex,
        stepIndex,
    }: ClosePositionTaskExecuteParams) {
        // Load the execution context.
        const {
            bot,
            liquidityPool,
            job,
            state: _state,
        } = await this.actionExecutionContextService.load(
            {
                botId,
                jobId,
                liquidityPoolId,
                state,
            }
        )
        const signResult = job.tasks[taskIndex].steps[stepIndex].signResult
        if (!signResult) {
            throw new SignResultNotFoundException(
                {
                    botId,
                    jobId,
                    liquidityPoolId: liquidityPool.displayId,
                    taskIndex,
                    stepIndex,
                }
            )
        }
        const signedTx = this.superJson.parse<SignedTx>(
            job.tasks[taskIndex].steps[stepIndex].signResult ?? ""
        )
        // We need validation here
        // Thus, we need to sign
        const executeResult = await this.closePositionActionService.execute(
            {
                bot,
                state: _state,
                txCheck: isRetry ?? false,
                liquidityPool,
                signedTx,
            }
        )
        // We update the database with the execute result.
        await this.connection.model<JobSchema>(
            JobSchema.name
        ).updateOne(
            {
                _id: {
                    $eq: jobId,
                },
            },
            {
                $set: {
                    "tasks.$[task].steps.$[step].type": StepType.Execute,
                    "tasks.$[task].steps.$[step].executeResult": this.superJson.stringify(executeResult),
                },
            },
            {
                arrayFilters: [
                    {
                        "task.index": taskIndex,
                        "task.type": TaskType.ClosePosition,
                        "step.index": stepIndex,
                    },
                ],
            },
        )
    }
}