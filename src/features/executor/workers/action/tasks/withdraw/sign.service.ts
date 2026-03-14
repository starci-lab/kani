import {
    Injectable 
} from "@nestjs/common"
import {
    BalanceActionService, PrepareTx 
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
    WithdrawTaskSignParams 
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
 * Service for the WITHDRAW TASK SIGN step.
 */
@Injectable()
export class WithdrawTaskSignService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
    ) {}

    /**
   * Process the WITHDRAW TASK SIGN step.
   */
    async process({
        bot,
        job,
        bullmqJob,
        taskIndex,
        jobType,
    }: WithdrawTaskSignParams) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        const step = job.tasks[taskIndex].steps?.[stepIndex]
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
            const prepareTx = this.superJson.parse<PrepareTx>(step.prepareTx)
            const { signedTx } = await this.balanceActionService.signReconcileBalanceTransaction({
                bot,
                prepareTx,
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Sign transaction successfully",
            })
            await this.connection
                .model<JobSchema>(JobSchema.name)
                .updateOne(
                    {
                        _id: job.id,
                    },
                    {
                        $set: {
                            "tasks.$[task].steps.$[step].type": StepType.Execute,
                            "tasks.$[task].steps.$[step].signedTx":
                this.superJson.stringify(signedTx),
                        },
                    },
                    {
                        arrayFilters: [
                            {
                                "task.index": taskIndex,
                                "task.type": TaskType.Withdraw,
                            },
                            {
                                "step.index": stepIndex,
                            },
                        ],
                    },
                )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Persist signed transaction successfully",
            })
            this.winstonService.log(WinstonLog.ActionJobTaskStepSigned,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: jobType,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                    stepIndex,
                    metadata: job.metadata,
                })
        } catch (error) {
            this.winstonService.log(WinstonLog.ActionJobTaskStepSignedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: jobType,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                })

            throw error
        }
    }
}