import {
    Injectable 
} from "@nestjs/common"
import {
    OpenPositionActionService, 
    PrepareTx
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobType,
    StepType, 
    TaskType,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    OpenPositionTaskSignParams 
} from "../types"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    strict as assert 
} from "node:assert"

/**
 * Service for the Open Position Task SIGN step.
 */
@Injectable()
export class OpenPositionTaskSignService {
    constructor(
        private readonly openPositionActionService: OpenPositionActionService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) { }
    /**
     * Process the Open Position Task SIGN step.
     *
     * @param params - The parameters for the step.
     * @param taskIndex - The index of the task.
     * @param bullmqJob - The BullMQ job.
     * @param job - The job.
     * @param bot - The bot.
     * @param liquidityPool - The liquidity pool.
     * @returns The result of the step.
     */
    async process({
        taskIndex,
        bullmqJob,
        job,
        bot,
        liquidityPool,
    }: OpenPositionTaskSignParams) {
        // active step index
        const activeStep = job.tasks[taskIndex].activeStep
        // prepare tx
        const prepareTx = this.superJson.parse<PrepareTx>(
            job.tasks[taskIndex].steps[activeStep].prepareTx
        )
        try {
            // Send heartbeat
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
                }
            )
            const { signedTx } = await this.openPositionActionService.sign(
                {
                    bot,
                    prepareTx,
                    liquidityPool,
                }
            )
            const updateJobResult = await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                {
                    _id: job.id 
                },
                {
                    $set: {
                        "tasks.$[task].steps.$[step].type": StepType.Execute,
                        "tasks.$[task].steps.$[step].signedTx": this.superJson.stringify(signedTx),
                    },
                },
                {
                    arrayFilters: [
                        {
                            "task.index": taskIndex, 
                            "task.type": TaskType.OpenPosition 
                        },
                        {
                            "step.index": activeStep 
                        },
                    ],
                },
            )
            assert(updateJobResult.matchedCount > 0)
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepSigned,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.OpenPosition,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                    stepIndex: activeStep,
                    metadata: job.metadata,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepSignedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.OpenPosition,
                    taskIndex,
                    taskType: TaskType.OpenPosition,
                    stepIndex: activeStep,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            throw error
        }
    }
}