import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionActionService, 
    PrepareClosePositionResult
} from "@modules/blockchains"
import {
    ActionExecutionContextService 
} from "../common"
import {
    ClosePositionTaskSignParams 
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
    PrepareResultNotFoundException 
} from "@modules/exceptions"
import {
    SendHeartbeatService 
} from "../../../action/send-heartbeat.service"

/**
 * Service for the Close Position Task SIGN step.
 */
@Injectable()
export class ClosePositionTaskSignService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        private readonly actionExecutionContextService: ActionExecutionContextService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async process({
        botId,
        bullmqJob,
        jobId,
        liquidityPoolId,
        state,
        taskIndex,
        stepIndex,
    }: ClosePositionTaskSignParams) {
        // Load the execution context.
        const {
            bot,
            liquidityPool,
            job,
        } = await this.actionExecutionContextService.load(
            {
                botId,
                jobId,
                liquidityPoolId,
                state,
            }
        )
        // try send heartbeat to BullMQ
        await this.sendHeartbeatService.process(
            {
                bot,
                job,
                bullmqJob,
            }
        )
        const prepareResult = job.tasks[taskIndex].prepareResult
        if (!prepareResult) {
            throw new PrepareResultNotFoundException(
                {
                    botId,
                    jobId,
                    liquidityPoolId: liquidityPool.displayId,
                    taskIndex,
                    stepIndex,
                }
            )
        }
        const prepareTx = this.superJson.parse<PrepareClosePositionResult>(
            prepareResult
        )
        // We need validation here
        // Thus, we need to sign
        const signedTx = await this.closePositionActionService.sign({
            bot,
            prepareTx: prepareTx.prepareTxs[stepIndex],
            liquidityPool,
        })
        // We update the database with the signed tx.
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
                    "tasks.$[task].steps.$[step].signResult": this.superJson.stringify(signedTx),
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