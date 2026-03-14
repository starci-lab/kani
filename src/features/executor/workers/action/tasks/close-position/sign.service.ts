import {
    Injectable 
} from "@nestjs/common"
import {
    ClosePositionActionService, 
    PrepareTx,
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
    ClosePositionTaskSignParams 
} from "../types"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"

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
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
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
        jobType,
    }: ClosePositionTaskSignParams) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        const stepIndex = job.tasks[taskIndex].activeStep
        const prepareTx = this.superJson.parse<PrepareTx>(
            job.tasks[taskIndex].steps[stepIndex].prepareTx,
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
            const { signedTx } = await this.closePositionActionService.sign(
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
            await this.connection.model<JobSchema>(JobSchema.name).updateOne(
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
                            "step.index": stepIndex 
                        },
                    ],
                },
            )
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
                    taskType: TaskType.ClosePosition,
                    stepIndex,
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
                    taskType: TaskType.ClosePosition,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            // log the error
            throw error
        }
    }
}