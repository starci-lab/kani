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
    strict as assert,
} from "node:assert"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"

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
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
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
        jobType,
    }: OpenPositionTaskSignParams) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        const activeStep = job.tasks[taskIndex].activeStep
        const prepareTx = this.superJson.parse<PrepareTx>(
            job.tasks[taskIndex].steps[activeStep].prepareTx,
        )
        try {
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
            const { signedTx } = await this.openPositionActionService.sign(
                {
                    bot,
                    prepareTx,
                    liquidityPool,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Sign transaction successfully",
            })
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
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Persist signed transaction successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepSigned,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: jobType,
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
                    type: jobType,
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