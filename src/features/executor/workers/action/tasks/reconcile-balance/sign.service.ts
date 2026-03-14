import {
    Injectable 
} from "@nestjs/common"
import {
    BalanceActionService, PrepareTx 
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
    ReconcileBalanceTaskSignParams 
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
 * Service for the Reconcile Balance Task SIGN step.
 */
@Injectable()
export class ReconcileBalanceTaskSignService {
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
   * Process the Reconcile Balance Task SIGN step.
   */
    async process({
        bot,
        job,
        bullmqJob,
        taskIndex,
    }: ReconcileBalanceTaskSignParams) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType: JobType.ReconcileBalance,
            jobId: job.id,
            botId: bot.id,
        })
        const stepIndex = job.tasks[taskIndex].activeStep ?? 0
        const step = job.tasks[taskIndex].steps?.[stepIndex]
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
            const prepareTx = this.superJson.parse<PrepareTx>(step.prepareTx)
            const { signedTx } = await this.balanceActionService.signReconcileBalanceTransaction(
                {
                    bot,
                    prepareTx,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Reconcile balance transaction signed successfully",
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
                            "task.type": TaskType.ReconcileBalance 
                        },
                        {
                            "step.index": stepIndex 
                        },
                    ],
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Signed transaction persisted successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskStepSigned,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.ReconcileBalance,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
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
                    type: JobType.ReconcileBalance,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                    stepIndex,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            throw error
        }
    }
}