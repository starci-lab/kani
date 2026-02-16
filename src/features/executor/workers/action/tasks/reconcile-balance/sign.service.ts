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
    strict as assert 
} from "node:assert"
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
        // Send heartbeat
        await this.sendHeartbeatService.process(
            {
                bot, job, bullmqJob 
            }
        )
        const activeStep = job.tasks[taskIndex].activeStep ?? 0
        const step = job.tasks[taskIndex].steps?.[activeStep]
        try {
        // prepareTx is persisted per-step by prepare service
            const prepareTx = this.superJson.parse<PrepareTx>(step.prepareTx)
            // Sign tx
            const { signedTx } = await this.balanceActionService.signReconcileBalanceTransaction(
                {
                    bot,
                    prepareTx,
                }
            )

            // Persist signedTx and advance step type to Execute
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
                            "task.type": TaskType.ReconcileBalance 
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
                    type: JobType.ReconcileBalance,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
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
                    type: JobType.ReconcileBalance,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                    stepIndex: activeStep,
                    error: error.message,
                    metadata: job.metadata,
                }
            )
            throw error
        }
    }
}