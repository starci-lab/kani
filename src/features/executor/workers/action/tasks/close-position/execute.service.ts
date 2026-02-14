import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionActionService, 
    SignedTx
} from "@modules/blockchains"
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
    ClosePositionTaskExecuteParams 
} from "../types"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    SignedTxNotFoundException 
} from "@modules/exceptions"
import {
    envConfig 
} from "@modules/env"

/**
 * Service for the Close Position Task EXECUTE step.
 */
@Injectable()
export class ClosePositionTaskExecuteService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
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
        bot,
        job,
        liquidityPool,
        state,
        isRetry,
        bullmqJob,
        taskIndex,
    }: ClosePositionTaskExecuteParams) {
        // send heartbeat
        await this.sendHeartbeatService.process(
            {
                bot,
                job,
                bullmqJob,
            }
        )
        // get the previous attempts
        const hasPreviousAttempts = bullmqJob.attemptsMade > 0
        // get the active step
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        // get the step
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        // get the signed tx
        const signedTx = step?.signedTx
        // if the signed tx is not found, throw an error
        if (!signedTx) {
            throw new SignedTxNotFoundException(
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                    taskIndex,
                    stepIndex,
                }
            )
        }
        // execute the signed tx
        const executeResult = await this.closePositionActionService.execute(
            {
                bot,
                state,
                txCheck: (hasPreviousAttempts || isRetry) ?? false,
                liquidityPool,
                signedTx: this.superJson.parse<SignedTx>(signedTx),
                stimulate: envConfig().executor.runtime.operation.closePosition.stimulate,
            }
        )
        // update the job with the execute result
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: job.id 
            },
            {
                $set: {
                    "tasks.$[task].steps.$[step].executeResult": this.superJson.stringify(executeResult),
                    "tasks.$[task].steps.$[step].type": StepType.Execute,
                },
                // Move to next step
                $inc: {
                    "tasks.$[task].activeStep": 1,
                },
            },
            {
                arrayFilters: [
                    {
                        "task.index": taskIndex, 
                        "task.type": TaskType.ClosePosition 
                    },
                    {
                        "step.index": stepIndex 
                    },
                ],
            },
        )
    }
}