import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionActionService, 
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
    ClosePositionTaskSignParams 
} from "../types"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    strict as assert 
} from "node:assert"
/**
 * Service for the Close Position Task SIGN step.
 */
@Injectable()
export class ClosePositionTaskSignService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }
    /**
     * Process the Close Position Task SIGN step.
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
    }: ClosePositionTaskSignParams) {
        
        // Send heartbeat
        await this.sendHeartbeatService.process(
            {
                bot,
                job,
                bullmqJob,
            }
        )
        const activeStep = job.tasks[taskIndex].activeStep
        const prepareTx = this.superJson.parse<PrepareTx>(
            job.tasks[taskIndex].steps[activeStep].prepareTx
        )
        try {
            const { signedTx } = await this.closePositionActionService.sign(
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
                            "task.type": TaskType.ClosePosition 
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
                    type: JobType.ClosePosition,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
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
                    type: JobType.ClosePosition,
                    taskIndex,
                    taskType: TaskType.ClosePosition,
                    stepIndex: activeStep,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            // log the error
            throw error
        }
    }
}